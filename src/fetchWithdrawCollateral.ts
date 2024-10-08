import debug from 'debug';
import { ethers } from 'ethers';

const log = debug('snx:fetchWithdrawCollateral');

export async function fetchWithdrawCollateral({
  provider,
  walletAddress,
  CoreProxyContract,
  accountId,
  collateralTypeTokenAddress,
  withdrawAmount,
}: {
  provider: ethers.providers.Web3Provider;
  walletAddress: string;
  CoreProxyContract: { address: string; abi: string[] };
  accountId: ethers.BigNumberish;
  collateralTypeTokenAddress: string;
  withdrawAmount: ethers.BigNumberish;
}) {
  const signer = provider.getSigner(walletAddress);
  const CoreProxy = new ethers.Contract(CoreProxyContract.address, CoreProxyContract.abi, signer);

  const withdrawCollateralTxnArgs = [
    //
    accountId,
    collateralTypeTokenAddress,
    withdrawAmount,
  ];
  log('withdrawCollateralTxnArgs: %O', withdrawCollateralTxnArgs);

  console.time('withdrawCollateral');
  const tx: ethers.ContractTransaction = await CoreProxy.withdraw(...withdrawCollateralTxnArgs);
  console.timeEnd('withdrawCollateral');
  log({ tx });
  const txResult = await tx.wait();
  log({ txResult });
  return { tx, txResult };
}
