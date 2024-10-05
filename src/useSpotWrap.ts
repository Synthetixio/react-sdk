import { useMutation } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { fetchApproveToken } from './fetchApproveToken';
import { fetchPriceUpdateTxn } from './fetchPriceUpdateTxn';
import { fetchSpotWrap } from './fetchSpotWrap';
import { fetchSpotWrapWithPriceUpdate } from './fetchSpotWrapWithPriceUpdate';
import { fetchTokenAllowance } from './fetchTokenAllowance';
import { fetchTokenBalance } from './fetchTokenBalance';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSpotGetPriceData } from './useSpotGetPriceData';
import { useSpotGetSettlementStrategy } from './useSpotGetSettlementStrategy';
import { useSynthetix } from './useSynthetix';

export function useSpotWrap({
  provider,
  walletAddress,
  tokenAddress: collateralTypeTokenAddress,
  synthTokenAddress,
  synthMarketId,
  settlementStrategyId,
  onSuccess,
}: {
  provider?: ethers.providers.Web3Provider;
  walletAddress?: string;
  tokenAddress?: string;
  synthTokenAddress?: string;
  synthMarketId?: ethers.BigNumberish;
  settlementStrategyId?: ethers.BigNumberish;
  onSuccess: () => void;
}) {
  const { chainId, queryClient } = useSynthetix();
  const errorParser = useErrorParser();

  const { data: SpotMarketProxyContract } = useImportContract('SpotMarketProxy');
  const { data: MulticallContract } = useImportContract('Multicall');
  const { data: PythERC7412WrapperContract } = useImportContract('PythERC7412Wrapper');

  const { data: priceData } = useSpotGetPriceData({ provider, synthMarketId });
  const { data: spotSettlementStrategy } = useSpotGetSettlementStrategy({
    provider,
    synthMarketId,
    settlementStrategyId,
  });

  return useMutation({
    mutationFn: async (amount: ethers.BigNumberish) => {
      if (
        !(
          chainId &&
          provider &&
          walletAddress &&
          collateralTypeTokenAddress &&
          synthTokenAddress &&
          synthMarketId &&
          SpotMarketProxyContract?.address &&
          MulticallContract?.address &&
          PythERC7412WrapperContract?.address &&
          priceData
        )
      ) {
        throw 'OMFG';
      }

      if (ethers.BigNumber.from(amount).lte(0)) {
        throw new Error('Amount required');
      }

      const freshBalance = await fetchTokenBalance({
        provider,
        collateralTypeTokenAddress,
        ownerAddress: walletAddress,
      });

      if (freshBalance.lt(amount)) {
        throw new Error('Not enough balance');
      }

      const freshAllowance = await fetchTokenAllowance({
        provider,
        collateralTypeTokenAddress,
        ownerAddress: walletAddress,
        spenderAddress: SpotMarketProxyContract.address,
      });

      if (freshAllowance.lt(amount)) {
        await fetchApproveToken({
          provider,
          walletAddress,
          collateralTypeTokenAddress,
          spenderAddress: SpotMarketProxyContract.address,
          allowance: ethers.BigNumber.from(amount).sub(freshAllowance),
        });
      }

      const freshPriceUpdateTxn = await fetchPriceUpdateTxn({
        provider,
        MulticallContract,
        PythERC7412WrapperContract,
        priceIds: [spotSettlementStrategy.feedId],
        stalenessTolerance: priceData.strictPriceStalenessTolerance,
      });
      console.log('fetchPriceUpdateTxn', freshPriceUpdateTxn);

      if (freshPriceUpdateTxn.value) {
        console.log('-> fetchSpotWrapWithPriceUpdate');
        await fetchSpotWrapWithPriceUpdate({
          provider,
          walletAddress,
          SpotMarketProxyContract,
          MulticallContract,
          synthMarketId,
          amount,
          priceUpdateTxn: freshPriceUpdateTxn,
        });
        return { priceUpdated: true };
      }

      console.log('-> fetchSpotWrap');
      await fetchSpotWrap({
        provider,
        walletAddress,
        SpotMarketProxyContract,
        synthMarketId,
        amount,
      });
      return { priceUpdated: false };
    },
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
    onSuccess: async ({ priceUpdated }) => {
      if (!queryClient) return;

      if (priceUpdated) {
        await queryClient.invalidateQueries({
          queryKey: [chainId, 'PriceUpdateTxn'],
        });
      }
      queryClient.invalidateQueries({
        queryKey: [
          chainId,
          'Allowance',
          { collateralTypeTokenAddress, ownerAddress: walletAddress, spenderAddress: SpotMarketProxyContract?.address },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [chainId, 'Balance', { tokenAddress: synthTokenAddress, ownerAddress: walletAddress }],
      });
      queryClient.invalidateQueries({
        queryKey: [chainId, 'Balance', { tokenAddress: collateralTypeTokenAddress, ownerAddress: walletAddress }],
      });

      onSuccess();
    },
  });
}
