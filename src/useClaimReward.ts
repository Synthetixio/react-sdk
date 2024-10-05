import { useMutation } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { fetchAccountAvailableCollateral } from './fetchAccountAvailableCollateral';
import { fetchPriceUpdateTxn } from './fetchPriceUpdateTxn';
import { fetchWithdrawCollateral } from './fetchWithdrawCollateral';
import { fetchWithdrawCollateralWithPriceUpdate } from './fetchWithdrawCollateralWithPriceUpdate';
import { useAllPriceFeeds } from './useAllPriceFeeds';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSynthetix } from './useSynthetix';

export function useClaimReward({
  provider,
  walletAddress,
  tokenAddress: collateralTypeTokenAddress,
  accountId,
  onSuccess,
}: {
  provider?: ethers.providers.Web3Provider;
  walletAddress?: string;
  tokenAddress?: string;
  accountId?: ethers.BigNumberish;
  onSuccess: () => void;
}) {
  const { chainId, queryClient } = useSynthetix();
  const errorParser = useErrorParser();

  const { data: priceIds } = useAllPriceFeeds();

  const { data: CoreProxyContract } = useImportContract('CoreProxy');
  const { data: MulticallContract } = useImportContract('Multicall');
  const { data: PythERC7412WrapperContract } = useImportContract('PythERC7412Wrapper');

  return useMutation({
    retry: false,
    mutationFn: async (withdrawAmount: ethers.BigNumberish) => {
      if (
        !(
          chainId &&
          provider &&
          walletAddress &&
          accountId &&
          collateralTypeTokenAddress &&
          CoreProxyContract &&
          MulticallContract &&
          PythERC7412WrapperContract &&
          priceIds
        )
      ) {
        throw 'OMFG';
      }

      if (ethers.BigNumber.from(withdrawAmount).eq(0)) {
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
        collateralTypeTokenAddress,
      });
      console.log('freshAccountAvailableCollateral', freshAccountAvailableCollateral);

      const hasEnoughDeposit = freshAccountAvailableCollateral.gte(withdrawAmount);
      if (!hasEnoughDeposit) {
        throw new Error('Not enough unlocked collateral');
      }

      if (freshPriceUpdateTxn.value) {
        console.log('-> withdrawCollateralWithPriceUpdate');
        await fetchWithdrawCollateralWithPriceUpdate({
          provider,
          walletAddress,
          CoreProxyContract,
          MulticallContract,
          accountId,
          collateralTypeTokenAddress,
          withdrawAmount,
          priceUpdateTxn: freshPriceUpdateTxn,
        });
        return { priceUpdated: true };
      }

      console.log('-> withdrawCollateral');
      await fetchWithdrawCollateral({
        provider,
        walletAddress,
        CoreProxyContract,
        accountId,
        collateralTypeTokenAddress,
        withdrawAmount,
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
            accountId: accountId ? ethers.BigNumber.from(accountId).toHexString() : undefined,
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
            accountId: accountId ? ethers.BigNumber.from(accountId).toHexString() : undefined,
            collateralTypeTokenAddress,
          },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          'Balance',
          {
            tokenAddress: collateralTypeTokenAddress,
            ownerAddress: walletAddress,
          },
        ],
      });

      onSuccess();
    },
  });
}
