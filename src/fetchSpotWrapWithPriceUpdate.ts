import { type BigNumberish, ethers } from 'ethers';

export async function fetchSpotWrapWithPriceUpdate({
  provider,
  walletAddress,
  SpotMarketProxyContract,
  MulticallContract,
  synthMarketId,
  amount,
  priceUpdateTxn,
}: {
  provider: ethers.providers.Web3Provider;
  walletAddress: BigNumberish;
  SpotMarketProxyContract: { address: string; abi: string[] };
  MulticallContract: { address: string; abi: string[] };
  synthMarketId: BigNumberish;
  amount: BigNumberish;
  priceUpdateTxn: {
    target: BigNumberish;
    callData: BigNumberish;
    value: BigNumberish;
    requireSuccess: boolean;
  };
}) {
  const SpotMarketProxyInterface = new ethers.utils.Interface(SpotMarketProxyContract.abi);
  const MulticallInterface = new ethers.utils.Interface(MulticallContract.abi);

  const wrapArgs = [synthMarketId, amount, amount];

  console.log({ wrapArgs });

  const wrapTxn = {
    target: SpotMarketProxyContract.address,
    callData: SpotMarketProxyInterface.encodeFunctionData('wrap', [...wrapArgs]),
    value: 0,
    requireSuccess: true,
  };
  console.log({ wrapTxn });

  const signer = provider.getSigner(walletAddress.toString());

  const multicallTxn = {
    from: walletAddress.toString(),
    to: MulticallContract.address,
    data: MulticallInterface.encodeFunctionData('aggregate3Value', [[priceUpdateTxn, wrapTxn]]),
    value: priceUpdateTxn.value,
  };
  console.log({ multicallTxn });

  console.time('fetchSpotWrapWithPriceUpdate');
  const tx: ethers.ContractTransaction = await signer.sendTransaction(multicallTxn);
  console.timeEnd('fetchSpotWrapWithPriceUpdate');

  const txResult = await tx.wait();
  console.log({ txResult });
  return txResult;
}
