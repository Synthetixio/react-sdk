import { useMutation } from '@tanstack/react-query';
import type { BigNumberish } from 'ethers';
import { ethers } from 'ethers';
import { fetchApproveToken } from './fetchApproveToken';
import { fetchPriceUpdateTxn } from './fetchPriceUpdateTxn';
import { fetchSpotSell } from './fetchSpotSell';
import { fetchSpotSellWithPriceUpdate } from './fetchSpotSellWithPriceUpdate';
import { fetchTokenAllowance } from './fetchTokenAllowance';
import { fetchTokenBalance } from './fetchTokenBalance';
import { useAllPriceFeeds } from './useAllPriceFeeds';
import { useErrorParser } from './useErrorParser';
import { useImportContract, useImportSystemToken } from './useImports';
import { useSpotGetPriceData } from './useSpotGetPriceData';
import { useSpotGetSettlementStrategy } from './useSpotGetSettlementStrategy';
import { useSynthetix } from './useSynthetix';

export function useSpotSell({
  provider,
  walletAddress,
  synthMarketId,
  settlementStrategyId,
  synthTokenAddress,
  onSuccess,
}: {
  provider?: ethers.providers.Web3Provider;
  walletAddress?: BigNumberish;
  synthMarketId?: BigNumberish;
  settlementStrategyId?: BigNumberish;
  synthTokenAddress?: BigNumberish;
  onSuccess: () => void;
}) {
  const { chainId, queryClient } = useSynthetix();
  const errorParser = useErrorParser();

  const { data: priceIds } = useAllPriceFeeds();
  const { data: SpotMarketProxyContract } = useImportContract('SpotMarketProxy');
  const { data: MulticallContract } = useImportContract('Multicall');
  const { data: PythERC7412WrapperContract } = useImportContract('PythERC7412Wrapper');
  const { data: systemToken } = useImportSystemToken();
  const { data: spotSettlementStrategy } = useSpotGetSettlementStrategy({
    provider,
    synthMarketId,
    settlementStrategyId,
  });
  const { data: priceData } = useSpotGetPriceData({ provider, synthMarketId });

  return useMutation({
    mutationFn: async (amount: BigNumberish) => {
      if (
        !(
          chainId &&
          SpotMarketProxyContract?.address &&
          MulticallContract?.address &&
          PythERC7412WrapperContract?.address &&
          walletAddress &&
          synthMarketId &&
          synthTokenAddress &&
          systemToken &&
          provider &&
          priceIds &&
          spotSettlementStrategy &&
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
        ownerAddress: walletAddress,
        tokenAddress: synthTokenAddress,
      });

      if (freshBalance.lt(amount)) {
        throw new Error('Not enough balance');
      }

      const freshAllowance = await fetchTokenAllowance({
        provider,
        ownerAddress: walletAddress,
        tokenAddress: synthTokenAddress,
        spenderAddress: SpotMarketProxyContract.address,
      });

      if (freshAllowance.lt(amount)) {
        await fetchApproveToken({
          provider,
          walletAddress,
          tokenAddress: synthTokenAddress,
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
      console.log('freshPriceUpdateTxn', freshPriceUpdateTxn);

      if (freshPriceUpdateTxn.value) {
        console.log('-> fetchSpotSellWithPriceUpdate');
        await fetchSpotSellWithPriceUpdate({
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

      console.log('-> fetchSpotSell');
      await fetchSpotSell({
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
    onSuccess: ({ priceUpdated }) => {
      if (!queryClient) return;

      if (priceUpdated) {
        queryClient.invalidateQueries({
          queryKey: [chainId, 'PriceUpdateTxn'],
        });
      }
      queryClient.invalidateQueries({
        queryKey: [chainId, 'Balance', { tokenAddress: systemToken?.address, ownerAddress: walletAddress }],
      });
      queryClient.invalidateQueries({
        queryKey: [chainId, 'Balance', { tokenAddress: synthTokenAddress, ownerAddress: walletAddress }],
      });
      onSuccess();
    },
  });
}
