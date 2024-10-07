import { useQuery } from '@tanstack/react-query';
import debug from 'debug';
import { ethers } from 'ethers';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSynthetix } from './useSynthetix';

const log = debug('usePerpsGetMarkets');

export function usePerpsGetMarkets({ provider }: { provider?: ethers.providers.BaseProvider }) {
  const { chainId } = useSynthetix();
  const errorParser = useErrorParser();
  const { data: PerpsMarketProxyContract } = useImportContract('PerpsMarketProxy');

  return useQuery<ethers.BigNumber[]>({
    enabled: Boolean(chainId && provider && PerpsMarketProxyContract?.address),
    queryKey: [chainId, 'Perps GetMarkets', { PerpsMarketProxy: PerpsMarketProxyContract?.address }],
    queryFn: async () => {
      if (!(chainId && provider && PerpsMarketProxyContract?.address)) {
        throw new Error('OMFG');
      }

      log({ chainId, provider, PerpsMarketProxyContract });

      console.time('usePerpsGetMarkets');
      const PerpsMarketProxy = new ethers.Contract(PerpsMarketProxyContract.address, PerpsMarketProxyContract.abi, provider);
      console.timeEnd('usePerpsGetMarkets');
      const markets = await PerpsMarketProxy.getMarkets();
      log({ markets });
      return markets;
    },
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
  });
}
