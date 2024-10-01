import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSynthetix } from './useSynthetix';

export function usePerpsGetSettlementStrategy({
  provider,
  settlementStrategyId,
  perpsMarketId,
}: { settlementStrategyId?: string; provider?: ethers.providers.BaseProvider; perpsMarketId?: string }) {
  const { chainId } = useSynthetix();
  const errorParser = useErrorParser();

  const { data: PerpsMarketProxyContract } = useImportContract('PerpsMarketProxy');

  return useQuery<{
    commitmentPriceDelay: ethers.BigNumber;
    disabled: boolean;
    feedId: string;
    priceVerificationContract: string;
    settlementDelay: ethers.BigNumber;
    settlementReward: ethers.BigNumber;
    settlementWindowDuration: ethers.BigNumber;
    strategyType: number;
  }>({
    enabled: Boolean(chainId && provider && PerpsMarketProxyContract?.address && settlementStrategyId && perpsMarketId),
    queryKey: [
      chainId,
      'PerpsGetSettlementStrategy',
      { PerpsMarketProxy: PerpsMarketProxyContract?.address },
      { perpsMarketId, settlementStrategyId },
    ],
    queryFn: async () => {
      if (!(chainId && provider && PerpsMarketProxyContract?.address && settlementStrategyId && perpsMarketId)) {
        throw 'OMFG';
      }

      const PerpsMarketProxy = new ethers.Contract(PerpsMarketProxyContract.address, PerpsMarketProxyContract.abi, provider);
      const settlementStrategy = await PerpsMarketProxy.getSettlementStrategy(perpsMarketId, settlementStrategyId);
      console.log({ settlementStrategy });
      return settlementStrategy;
    },
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
  });
}