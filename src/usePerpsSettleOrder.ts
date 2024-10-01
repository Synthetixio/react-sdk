import { useMutation } from '@tanstack/react-query';
import type { ethers } from 'ethers';
import { fetchPerpsSettleOrder } from './fetchPerpsSettleOrder';
import { fetchPerpsSettleOrderWithPriceUpdate } from './fetchPerpsSettleOrderWithPriceUpdate';
import { fetchStrictPriceUpdateTxn } from './fetchStrictPriceUpdateTxn';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { usePerpsGetOrder } from './usePerpsGetOrder';
import { usePerpsGetSettlementStrategy } from './usePerpsGetSettlementStrategy';
import { usePerpsSelectedAccountId } from './usePerpsSelectedAccountId';
import { useSynthetix } from './useSynthetix';

export function usePerpsSettleOrder({
  provider,
  walletAddress,
  perpsMarketId,
  perpsAccountIdFromParams,
  settlementStrategyId,
}: {
  provider?: ethers.providers.Web3Provider;
  walletAddress?: string;
  perpsMarketId?: string;
  perpsAccountIdFromParams?: string;
  settlementStrategyId?: string;
}) {
  const { chainId, queryClient } = useSynthetix();
  const errorParser = useErrorParser();
  const { data: PerpsMarketProxyContract } = useImportContract('PerpsMarketProxy');
  const { data: MulticallContract } = useImportContract('Multicall');
  const { data: PythERC7412WrapperContract } = useImportContract('PythERC7412Wrapper');
  const perpsAccountId = usePerpsSelectedAccountId({ provider, walletAddress, perpsAccountId: perpsAccountIdFromParams });
  const { data: settlementStrategy } = usePerpsGetSettlementStrategy({ provider, perpsMarketId, settlementStrategyId });
  const { data: order } = usePerpsGetOrder({ provider, perpsAccountId });

  return useMutation({
    retry: false,
    mutationFn: async () => {
      if (
        !(
          chainId &&
          provider &&
          walletAddress &&
          PerpsMarketProxyContract?.address &&
          MulticallContract?.address &&
          PythERC7412WrapperContract?.address &&
          perpsAccountId &&
          perpsMarketId &&
          settlementStrategy &&
          order
        )
      ) {
        throw 'OMFG';
      }

      const freshStrictPriceUpdateTxn = await fetchStrictPriceUpdateTxn({
        commitmentTime: order.commitmentTime,
        feedId: settlementStrategy.feedId,
        commitmentPriceDelay: settlementStrategy.commitmentPriceDelay,
        PythERC7412WrapperContract,
      });

      if (freshStrictPriceUpdateTxn.value) {
        console.log('-> fetchPerpsSettleOrderWithPriceUpdate');
        await fetchPerpsSettleOrderWithPriceUpdate({
          provider,
          walletAddress,
          PerpsMarketProxyContract,
          MulticallContract,
          perpsAccountId,
          priceUpdateTxn: freshStrictPriceUpdateTxn,
        });
        return { priceUpdated: true };
      }

      console.log('-> fetchPerpsSettleOrder');
      await fetchPerpsSettleOrder({
        provider,
        walletAddress,
        PerpsMarketProxyContract,
        perpsAccountId,
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
        queryKey: [
          chainId,
          'PerpsGetOpenPosition',
          { PerpsMarketProxy: PerpsMarketProxyContract?.address },
          { walletAddress, perpsAccountId, perpsMarketId },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [chainId, 'PerpsGetOrder', { PerpsMarketProxy: PerpsMarketProxyContract?.address }, perpsAccountId],
      });
      queryClient.invalidateQueries({
        queryKey: [chainId, 'Perps GetAvailableMargin', { PerpsMarketProxy: PerpsMarketProxyContract?.address }, perpsAccountId],
      });
    },
  });
}