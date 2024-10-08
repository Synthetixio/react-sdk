import { useMutation } from '@tanstack/react-query';
import debug from 'debug';
import { ethers } from 'ethers';
import { delegateCollateral } from './delegateCollateral';
import { delegateCollateralWithPriceUpdate } from './delegateCollateralWithPriceUpdate';
import { fetchAccountAvailableCollateral } from './fetchAccountAvailableCollateral';
import { fetchPositionCollateral } from './fetchPositionCollateral';
import { fetchPriceUpdateTxn } from './fetchPriceUpdateTxn';
import { useAllPriceFeeds } from './useAllPriceFeeds';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSynthetix } from './useSynthetix';

const log = debug('snx:useDelegateCollateral');

export function useDelegateCollateral({
  provider,
  walletAddress,
  collateralTypeTokenAddress,
  poolId,
  accountId,
  onSuccess,
}: {
  provider?: ethers.providers.Web3Provider;
  walletAddress?: string;
  collateralTypeTokenAddress?: string;
  poolId?: ethers.BigNumberish;
  accountId?: ethers.BigNumberish;
  onSuccess: () => void;
}) {
  const { chainId, preset, queryClient } = useSynthetix();
  const errorParser = useErrorParser();

  const { data: CoreProxyContract } = useImportContract('CoreProxy');
  const { data: MulticallContract } = useImportContract('Multicall');
  const { data: PythERC7412WrapperContract } = useImportContract('PythERC7412Wrapper');

  const { data: priceIds } = useAllPriceFeeds();

  return useMutation({
    retry: false,
    mutationFn: async (delegateAmountDelta: ethers.BigNumberish) => {
      if (
        !(
          chainId &&
          CoreProxyContract &&
          MulticallContract &&
          PythERC7412WrapperContract &&
          priceIds &&
          provider &&
          walletAddress &&
          accountId &&
          poolId &&
          collateralTypeTokenAddress
        )
      ) {
        throw 'OMFG';
      }

      log({
        chainId,
        preset,
        CoreProxyContract,
        MulticallContract,
        PythERC7412WrapperContract,
        priceIds,
        walletAddress,
        accountId,
        poolId,
        collateralTypeTokenAddress,
      });

      if (ethers.BigNumber.from(delegateAmountDelta).eq(0)) {
        throw new Error('Amount required');
      }

      const freshPriceUpdateTxn = await fetchPriceUpdateTxn({
        provider,
        MulticallContract,
        PythERC7412WrapperContract,
        priceIds,
      });
      log('freshPriceUpdateTxn: %O', freshPriceUpdateTxn);

      const freshAccountAvailableCollateral = await fetchAccountAvailableCollateral({
        provider,
        CoreProxyContract,
        accountId,
        collateralTypeTokenAddress,
      });
      log('freshAccountAvailableCollateral: %O', freshAccountAvailableCollateral);

      const hasEnoughDeposit = freshAccountAvailableCollateral.gte(delegateAmountDelta);
      if (!hasEnoughDeposit) {
        throw new Error('Not enough deposit');
      }

      const freshPositionCollateral = await fetchPositionCollateral({
        provider,
        CoreProxyContract,
        accountId,
        poolId,
        collateralTypeTokenAddress,
      });
      log('freshPositionCollateral: %O', freshPositionCollateral);

      const delegateAmount = freshPositionCollateral.add(delegateAmountDelta);
      log('delegateAmount: %O', delegateAmount);

      if (freshPriceUpdateTxn.value) {
        log('-> delegateCollateralWithPriceUpdate');
        const { tx, txResult } = await delegateCollateralWithPriceUpdate({
          provider,
          walletAddress,
          CoreProxyContract,
          MulticallContract,
          accountId,
          poolId,
          collateralTypeTokenAddress,
          delegateAmount,
          priceUpdateTxn: freshPriceUpdateTxn,
        });
        return { priceUpdated: true, tx, txResult };
      }
      log('-> delegateCollateral');
      const { tx, txResult } = await delegateCollateral({
        provider,
        walletAddress,
        CoreProxyContract,
        accountId,
        poolId,
        collateralTypeTokenAddress,
        delegateAmount,
      });

      return { priceUpdated: false, tx, txResult };
    },
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
    onSuccess: ({ priceUpdated }) => {
      if (!queryClient) return;

      if (priceUpdated) {
        queryClient.invalidateQueries({
          queryKey: [chainId, preset, 'PriceUpdateTxn'],
        });
      }

      // Intentionally do not await
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          preset,
          'AccountCollateral',
          { CoreProxy: CoreProxyContract?.address, Multicall: MulticallContract?.address },
          {
            accountId: accountId ? ethers.BigNumber.from(accountId).toHexString() : undefined,
            collateralTypeTokenAddress,
          },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          preset,
          'AccountAvailableCollateral',
          { CoreProxy: CoreProxyContract?.address },
          {
            accountId: accountId ? ethers.BigNumber.from(accountId).toHexString() : undefined,
            collateralTypeTokenAddress,
          },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          preset,
          'PositionCollateral',
          { CoreProxy: CoreProxyContract?.address },
          {
            accountId: accountId ? ethers.BigNumber.from(accountId).toHexString() : undefined,
            poolId: poolId ? ethers.BigNumber.from(poolId).toHexString() : undefined,
            collateralTypeTokenAddress,
          },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          preset,
          'PositionDebt',
          { CoreProxy: CoreProxyContract?.address, Multicall: MulticallContract?.address },
          {
            accountId: accountId ? ethers.BigNumber.from(accountId).toHexString() : undefined,
            collateralTypeTokenAddress,
          },
        ],
      });

      onSuccess();
    },
  });
}
