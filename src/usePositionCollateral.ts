import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { fetchPositionCollateral } from './fetchPositionCollateral';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSynthetix } from './useSynthetix';

export function usePositionCollateral({
  provider,
  accountId,
  poolId,
  tokenAddress,
}: {
  accountId?: ethers.BigNumber;
  poolId?: ethers.BigNumber;
  tokenAddress?: string;
  provider?: ethers.providers.BaseProvider;
}) {
  const { chainId } = useSynthetix();
  const errorParser = useErrorParser();

  const { data: CoreProxyContract } = useImportContract('CoreProxy');

  return useQuery<ethers.BigNumber>({
    enabled: Boolean(chainId && CoreProxyContract?.address && provider && accountId && poolId && tokenAddress),
    queryKey: [
      chainId,
      'PositionCollateral',
      { CoreProxy: CoreProxyContract?.address },
      {
        accountId: accountId?.toHexString(),
        poolId: poolId?.toHexString(),
        tokenAddress,
      },
    ],
    queryFn: async () => {
      if (!(chainId && CoreProxyContract?.address && provider && accountId && poolId && tokenAddress)) {
        throw 'OMFG';
      }
      return fetchPositionCollateral({
        provider,
        CoreProxyContract,
        accountId,
        poolId,
        tokenAddress,
      });
    },
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
    select: (positionCollateral) => ethers.BigNumber.from(positionCollateral),
  });
}