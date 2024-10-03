import { type BigNumberish, ethers } from 'ethers';

export async function fetchPerpsGetAvailableMargin({
  provider,
  perpsAccountId,
  PerpsMarketProxyContract,
}: {
  provider: ethers.providers.BaseProvider;
  perpsAccountId: BigNumberish;
  PerpsMarketProxyContract: { address: string; abi: string[] };
}) {
  const PerpsMarketProxy = new ethers.Contract(PerpsMarketProxyContract.address, PerpsMarketProxyContract.abi, provider);
  console.time('fetchPerpsGetAvailableMargin');
  const availableMargin = await PerpsMarketProxy.getAvailableMargin(perpsAccountId);
  console.timeEnd('fetchPerpsGetAvailableMargin');
  console.log({ availableMargin });
  return availableMargin;
}
