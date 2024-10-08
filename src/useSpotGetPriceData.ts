import { useQuery } from '@tanstack/react-query';
import debug from 'debug';
import { ethers } from 'ethers';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSynthetix } from './useSynthetix';

const log = debug('snx:useSpotGetPriceData');

export function useSpotGetPriceData({
  provider,
  synthMarketId,
}: { provider?: ethers.providers.BaseProvider; synthMarketId?: ethers.BigNumberish }) {
  const { chainId, preset } = useSynthetix();
  const { data: SpotMarketProxyContract } = useImportContract('SpotMarketProxy');
  const errorParser = useErrorParser();

  return useQuery<{
    buyFeedId: string;
    sellFeedId: string;
    strictPriceStalenessTolerance: ethers.BigNumber;
  }>({
    enabled: Boolean(chainId && SpotMarketProxyContract?.address && provider && synthMarketId),
    queryKey: [chainId, preset, 'GetPriceData', { SpotMarketProxy: SpotMarketProxyContract?.address }, synthMarketId],
    queryFn: async () => {
      if (!(chainId && SpotMarketProxyContract?.address && provider && synthMarketId)) {
        throw new Error('OMFG');
      }

      log({ chainId, preset, SpotMarketProxyContract, synthMarketId });

      const SpotMarketProxy = new ethers.Contract(SpotMarketProxyContract.address, SpotMarketProxyContract.abi, provider);
      const priceData = await SpotMarketProxy.getPriceData(synthMarketId);
      log('priceData: %O', priceData);
      return priceData;
    },
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
  });
}
