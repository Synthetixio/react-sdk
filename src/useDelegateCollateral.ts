import { useMutation } from '@tanstack/react-query';
import type { BigNumberish } from 'ethers';
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

export function useDelegateCollateral({
  provider,
  walletAddress,
  collateralTypeTokenAddress,
  poolId,
  accountId,
  onSuccess,
}: {
  provider?: ethers.providers.Web3Provider;
  walletAddress?: BigNumberish;
  collateralTypeTokenAddress?: BigNumberish;
  poolId?: BigNumberish;
  accountId?: BigNumberish;
  onSuccess: () => void;
}) {
  const { chainId, queryClient } = useSynthetix();
  const errorParser = useErrorParser();

  const { data: CoreProxyContract } = useImportContract('CoreProxy');
  const { data: MulticallContract } = useImportContract('Multicall');
  const { data: PythERC7412WrapperContract } = useImportContract('PythERC7412Wrapper');

  const { data: priceIds } = useAllPriceFeeds();

  return useMutation({
    retry: false,
    mutationFn: async (delegateAmountDelta: BigNumberish) => {
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

      if (ethers.BigNumber.from(delegateAmountDelta).eq(0)) {
        throw new Error('Amount required');
      }

      const freshPriceUpdateTxn = await fetchPriceUpdateTxn({
        provider,
        MulticallContract,
        PythERC7412WrapperContract,
        priceIds,
      });
      console.log('freshPriceUpdateTxn', freshPriceUpdateTxn);

      const freshAccountAvailableCollateral = await fetchAccountAvailableCollateral({
        provider,
        CoreProxyContract,
        accountId,
        tokenAddress: collateralTypeTokenAddress,
      });
      console.log('freshAccountAvailableCollateral', freshAccountAvailableCollateral);

      const hasEnoughDeposit = freshAccountAvailableCollateral.gte(delegateAmountDelta);
      if (!hasEnoughDeposit) {
        throw new Error('Not enough deposit');
      }

      const freshPositionCollateral = await fetchPositionCollateral({
        provider,
        CoreProxyContract,
        accountId,
        poolId,
        tokenAddress: collateralTypeTokenAddress,
      });
      console.log('freshPositionCollateral', freshPositionCollateral);

      const delegateAmount = freshPositionCollateral.add(delegateAmountDelta);
      console.log('delegateAmount', delegateAmount);

      if (freshPriceUpdateTxn.value) {
        console.log('-> delegateCollateralWithPriceUpdate');
        await delegateCollateralWithPriceUpdate({
          provider,
          walletAddress,
          CoreProxyContract,
          MulticallContract,
          accountId,
          poolId,
          tokenAddress: collateralTypeTokenAddress,
          delegateAmount,
          priceUpdateTxn: freshPriceUpdateTxn,
        });
        return { priceUpdated: true };
      }
      console.log('-> delegateCollateral');
      await delegateCollateral({
        provider,
        walletAddress,
        CoreProxyContract,
        accountId,
        poolId,
        tokenAddress: collateralTypeTokenAddress,
        delegateAmount,
      });

      return { priceUpdated: false };
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
          queryKey: [chainId, 'PriceUpdateTxn'],
        });
      }

      // Intentionally do not await
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          'AccountCollateral',
          { CoreProxy: CoreProxyContract?.address, Multicall: MulticallContract?.address },
          {
            accountId: ethers.BigNumber.from(accountId).toHexString(),
            tokenAddress: collateralTypeTokenAddress,
          },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          'AccountAvailableCollateral',
          { CoreProxy: CoreProxyContract?.address },
          {
            accountId: ethers.BigNumber.from(accountId).toHexString(),
            tokenAddress: collateralTypeTokenAddress,
          },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          'PositionCollateral',
          { CoreProxy: CoreProxyContract?.address },
          {
            accountId: ethers.BigNumber.from(accountId).toHexString(),
            poolId: ethers.BigNumber.from(poolId).toHexString(),
            tokenAddress: collateralTypeTokenAddress,
          },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          'PositionDebt',
          { CoreProxy: CoreProxyContract?.address, Multicall: MulticallContract?.address },
          {
            accountId: ethers.BigNumber.from(accountId).toHexString(),
            tokenAddress: collateralTypeTokenAddress,
          },
        ],
      });

      onSuccess();
    },
  });
}
