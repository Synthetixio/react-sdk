import { type BigNumberish, ethers } from 'ethers';

export async function fetchBurnUsd({
  provider,
  walletAddress,
  CoreProxyContract,
  accountId,
  poolId,
  tokenAddress,
  burnUsdAmount,
}: {
  provider: ethers.providers.Web3Provider;
  walletAddress: BigNumberish;
  CoreProxyContract: { address: string; abi: string[] };
  accountId: BigNumberish;
  poolId: BigNumberish;
  tokenAddress: BigNumberish;
  burnUsdAmount: BigNumberish;
}) {
  const signer = provider.getSigner(walletAddress.toString());
  const CoreProxy = new ethers.Contract(CoreProxyContract.address, CoreProxyContract.abi, signer);

  const burnUsdTxnArgs = [
    //
    accountId,
    poolId,
    tokenAddress,
    burnUsdAmount,
  ];
  console.log({ burnUsdTxnArgs });

  console.time('burnUsd');
  const tx: ethers.ContractTransaction = await CoreProxy.burnUsd(...burnUsdTxnArgs);
  console.timeEnd('burnUsd');
  console.log({ tx });
  const txResult = await tx.wait();
  console.log({ txResult });
  return txResult;
}
