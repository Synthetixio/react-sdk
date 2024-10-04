import { ethers } from 'ethers';

export async function fetchPerpsCommitOrder({
  provider,
  walletAddress,
  PerpsMarketProxyContract,
  orderCommitmentArgs,
}: {
  provider: ethers.providers.Web3Provider;
  walletAddress: string;
  PerpsMarketProxyContract: { address: string; abi: string[] };
  orderCommitmentArgs: {
    perpsMarketId: ethers.BigNumberish;
    perpsAccountId: ethers.BigNumberish;
    sizeDelta: ethers.BigNumberish;
    settlementStrategyId: ethers.BigNumberish;
    acceptablePrice: ethers.BigNumberish;
    referrer: string;
    trackingCode: ethers.BigNumberish;
  };
}) {
  const signer = provider.getSigner(walletAddress);
  const PerpsMarketProxy = new ethers.Contract(PerpsMarketProxyContract.address, PerpsMarketProxyContract.abi, signer);

  console.time('fetchPerpsCommitOrder');
  const tx: ethers.ContractTransaction = await PerpsMarketProxy.commitOrder({
    marketId: orderCommitmentArgs.perpsMarketId,
    accountId: orderCommitmentArgs.perpsAccountId,
    sizeDelta: orderCommitmentArgs.sizeDelta,
    settlementStrategyId: orderCommitmentArgs.settlementStrategyId,
    acceptablePrice: orderCommitmentArgs.acceptablePrice,
    referrer: orderCommitmentArgs.referrer,
    trackingCode: orderCommitmentArgs.trackingCode,
  });
  console.timeEnd('fetchPerpsCommitOrder');
  const txResult = await tx.wait();
  console.log({ txResult });
  return txResult;
}
