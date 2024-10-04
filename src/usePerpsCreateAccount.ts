import { useMutation } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSynthetix } from './useSynthetix';

export function usePerpsCreateAccount({
  provider,
  walletAddress,
  handleAccountCreated,
}: { walletAddress?: string; provider?: ethers.providers.Web3Provider; handleAccountCreated: (accountId: string) => void }) {
  const { chainId, queryClient } = useSynthetix();
  const errorParser = useErrorParser();

  const { data: PerpsMarketProxyContract } = useImportContract('PerpsMarketProxy');
  const { data: PerpsAccountProxyContract } = useImportContract('PerpsAccountProxy');

  return useMutation({
    mutationFn: async () => {
      if (!(chainId && PerpsMarketProxyContract && PerpsAccountProxyContract && walletAddress && provider && queryClient)) throw 'OMFG';

      const signer = provider.getSigner(walletAddress);
      const PerpsMarketProxy = new ethers.Contract(PerpsMarketProxyContract.address, PerpsMarketProxyContract.abi, signer);
      const tx: ethers.ContractTransaction = await PerpsMarketProxy['createAccount()']();
      console.log({ tx });
      const txResult = await tx.wait();
      console.log({ txResult });

      const event = txResult.events?.find((e) => e.event === 'AccountCreated');
      if (event) {
        const accountId = event?.args?.accountId?.toString();
        if (accountId) {
          queryClient.setQueryData(
            [chainId, 'PerpsAccounts', { PerpsAccountProxy: PerpsAccountProxyContract?.address }, { ownerAddress: walletAddress }],
            (oldData: string[]) => oldData.concat([accountId])
          );
          handleAccountCreated(accountId);
        }
      }

      return txResult;
    },
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
  });
}
