import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { fetchTokenAllowance } from './fetchTokenAllowance';
import { useErrorParser } from './useErrorParser';
import { useSynthetix } from './useSynthetix';

export function useTokenAllowance({
  provider,
  tokenAddress: collateralTypeTokenAddress,
  ownerAddress,
  spenderAddress,
}: {
  provider?: ethers.providers.BaseProvider;
  tokenAddress?: string;
  ownerAddress?: string;
  spenderAddress?: string;
}) {
  const { chainId } = useSynthetix();
  const errorParser = useErrorParser();

  return useQuery<ethers.BigNumber>({
    enabled: Boolean(chainId && provider && collateralTypeTokenAddress && ownerAddress && spenderAddress),
    queryKey: [chainId, 'Allowance', { collateralTypeTokenAddress, ownerAddress, spenderAddress }],
    queryFn: async () => {
      if (!(chainId && provider && collateralTypeTokenAddress && ownerAddress && spenderAddress)) {
        throw 'OMFG';
      }
      return fetchTokenAllowance({
        provider,
        collateralTypeTokenAddress,
        ownerAddress,
        spenderAddress,
      });
    },
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
    select: (allowance) => ethers.BigNumber.from(allowance),
    refetchInterval: 5 * 60 * 1000,
  });
}
