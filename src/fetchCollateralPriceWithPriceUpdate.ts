import { ethers } from 'ethers';

export async function fetchCollateralPriceWithPriceUpdate({
  provider,
  CoreProxyContract,
  MulticallContract,
  tokenAddress,
  priceUpdateTxn,
}: {
  provider: ethers.providers.Web3Provider;
  CoreProxyContract: { address: string; abi: string[] };
  MulticallContract: { address: string; abi: string[] };
  tokenAddress: string;
  priceUpdateTxn: {
    target: string;
    callData: ethers.BigNumberish;
    value: ethers.BigNumberish;
    requireSuccess: boolean;
  };
}) {
  const CoreProxyInterface = new ethers.utils.Interface(CoreProxyContract.abi);
  const MulticallInterface = new ethers.utils.Interface(MulticallContract.abi);

  await new Promise((ok) => setTimeout(ok, 500));

  const getCollateralPriceTxn = {
    target: CoreProxyContract.address,
    callData: CoreProxyInterface.encodeFunctionData('getCollateralPrice', [tokenAddress]),
    value: 0,
    requireSuccess: true,
  };

  console.time('fetchCollateralPriceWithPriceUpdate');

  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);
  console.log({
    block,
    now: Math.floor(new Date().getTime() / 1000),
    to: MulticallContract.address,
    data: MulticallInterface.encodeFunctionData('aggregate3Value', [[priceUpdateTxn, getCollateralPriceTxn]]),
    value: priceUpdateTxn.value,
  });

  const response = await provider.call({
    to: MulticallContract.address,
    data: MulticallInterface.encodeFunctionData('aggregate3Value', [[priceUpdateTxn, getCollateralPriceTxn]]),
    value: priceUpdateTxn.value,
  });
  console.timeEnd('fetchCollateralPriceWithPriceUpdate');
  console.log({ response });

  if (response) {
    const decodedMulticall = MulticallInterface.decodeFunctionResult('aggregate3Value', response);
    console.log({ decodedMulticall });
    if (decodedMulticall?.returnData?.[1]?.returnData) {
      const getCollateralPriceTxnData = decodedMulticall.returnData[1].returnData;
      console.log({ getCollateralPriceTxnData });
      const collateralPrice = CoreProxyInterface.decodeFunctionResult('getCollateralPrice', getCollateralPriceTxnData);
      console.log('>>>>> collateralPrice', collateralPrice);
      return collateralPrice[0];
    }
    console.error({ decodedMulticall });
    throw new Error('Unexpected multicall response');
  }
  throw new Error('Empty multicall response');
}
