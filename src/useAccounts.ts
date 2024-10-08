import { useQuery } from '@tanstack/react-query';
import debug from 'debug';
import { ethers } from 'ethers';
import { useErrorParser } from './useErrorParser';
import { useImportContract } from './useImports';
import { useSynthetix } from './useSynthetix';

const log = debug('snx:useAccounts');

export function useAccounts({ provider, walletAddress }: { walletAddress?: string; provider?: ethers.providers.BaseProvider }) {
  const { chainId, preset } = useSynthetix();
  const errorParser = useErrorParser();
  const { data: AccountProxyContract } = useImportContract('AccountProxy');

  return useQuery<ethers.BigNumber[]>({
    enabled: Boolean(chainId && preset && provider && AccountProxyContract?.address && walletAddress),
    queryKey: [chainId, preset, 'Accounts', { AccountProxy: AccountProxyContract?.address }, { ownerAddress: walletAddress }],
    queryFn: async () => {
      if (!(chainId && preset && provider && AccountProxyContract?.address && walletAddress)) throw 'OMFG';

      log({ chainId, preset, AccountProxyContract, walletAddress });

      const AccountProxy = new ethers.Contract(AccountProxyContract.address, AccountProxyContract.abi, provider);
      const numberOfAccountTokens = await AccountProxy.balanceOf(walletAddress);
      if (numberOfAccountTokens.eq(0)) {
        // No accounts created yet
        return [];
      }
      const accountIndexes = Array.from(Array(numberOfAccountTokens.toNumber()).keys());
      const accounts = await Promise.all(accountIndexes.map((i) => AccountProxy.tokenOfOwnerByIndex(walletAddress, i)));
      log('accounts: %O', accounts);
      return accounts;
    },
    select: (accounts) => accounts.map((accountId) => ethers.BigNumber.from(accountId)),
    throwOnError: (error) => {
      // TODO: show toast
      errorParser(error);
      return false;
    },
  });
}
