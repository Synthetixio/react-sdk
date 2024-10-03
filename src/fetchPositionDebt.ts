import { type BigNumberish, ethers } from 'ethers';

export async function fetchPositionDebt({
  provider,
  CoreProxyContract,
  accountId,
  poolId,
  tokenAddress,
}: {
  provider: ethers.providers.Web3Provider;
  CoreProxyContract: { address: string; abi: string[] };
  accountId: BigNumberish;
  poolId: BigNumberish;
  tokenAddress: BigNumberish;
}) {
  const CoreProxy = new ethers.Contract(CoreProxyContract.address, CoreProxyContract.abi, provider);
  console.time('fetchPositionDebt');
  const positionDebt = await CoreProxy.callStatic.getPositionDebt(accountId, poolId, tokenAddress);
  console.timeEnd('fetchPositionDebt');
  return positionDebt;
}
