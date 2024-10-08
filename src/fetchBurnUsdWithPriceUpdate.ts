import debug from 'debug';
import { ethers } from 'ethers';

const log = debug('snx:fetchBurnUsdWithPriceUpdate');

export async function fetchBurnUsdWithPriceUpdate({
  provider,
  walletAddress,
  CoreProxyContract,
  MulticallContract,
  accountId,
  poolId,
  collateralTypeTokenAddress,
  burnUsdAmount,
  priceUpdateTxn,
}: {
  provider: ethers.providers.Web3Provider;
  walletAddress: string;
  CoreProxyContract: { address: string; abi: string[] };
  MulticallContract: { address: string; abi: string[] };
  accountId: ethers.BigNumberish;
  poolId: ethers.BigNumberish;
  collateralTypeTokenAddress: string;
  burnUsdAmount: ethers.BigNumberish;
  priceUpdateTxn: {
    target: string;
    callData: string;
    value: ethers.BigNumberish;
    requireSuccess: boolean;
  };
}) {
  const CoreProxyInterface = new ethers.utils.Interface(CoreProxyContract.abi);
  const MulticallInterface = new ethers.utils.Interface(MulticallContract.abi);

  const burnUsdTxnArgs = [
    //
    accountId,
    poolId,
    collateralTypeTokenAddress,
    burnUsdAmount,
  ];
  log('burnUsdTxnArgs: %O', burnUsdTxnArgs);

  const burnUsdTxn = {
    target: CoreProxyContract.address,
    callData: CoreProxyInterface.encodeFunctionData('burnUsd', [
      //
      ...burnUsdTxnArgs,
    ]),
    value: 0,
    requireSuccess: true,
  };
  log('burnUsdTxn: %O', burnUsdTxn);

  const signer = provider.getSigner(walletAddress);

  const multicallTxn = {
    from: walletAddress,
    to: MulticallContract.address,
    data: MulticallInterface.encodeFunctionData('aggregate3Value', [[priceUpdateTxn, burnUsdTxn]]),
    value: priceUpdateTxn.value,
  };
  log('multicallTxn: %O', multicallTxn);

  console.time('burnUsd');
  const tx: ethers.ContractTransaction = await signer.sendTransaction(multicallTxn);
  console.timeEnd('burnUsd');
  log({ tx });
  const txResult = await tx.wait();
  log({ txResult });
  return { tx, txResult };
}
