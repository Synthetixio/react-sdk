import { ethers } from 'ethers';

export async function fetchAccountCollateralWithPriceUpdate({
  provider,
  CoreProxyContract,
  MulticallContract,
  accountId,
  collateralTypeTokenAddress,
  priceUpdateTxn,
}: {
  provider: ethers.providers.BaseProvider;
  CoreProxyContract: { address: string; abi: string[] };
  MulticallContract: { address: string; abi: string[] };
  accountId: ethers.BigNumberish;
  collateralTypeTokenAddress: string;
  priceUpdateTxn: {
    target: string;
    callData: string;
    value: ethers.BigNumberish;
    requireSuccess: boolean;
  };
}) {
  const CoreProxyInterface = new ethers.utils.Interface(CoreProxyContract.abi);
  const MulticallInterface = new ethers.utils.Interface(MulticallContract.abi);

  await new Promise((ok) => setTimeout(ok, 500));

  const getAccountCollateralTxn = {
    target: CoreProxyContract.address,
    callData: CoreProxyInterface.encodeFunctionData('getAccountCollateral', [accountId, collateralTypeTokenAddress]),
    value: 0,
    requireSuccess: true,
  };

  console.time('fetchAccountCollateralWithPriceUpdate');
  const response = await provider.call({
    to: MulticallContract.address,
    data: MulticallInterface.encodeFunctionData('aggregate3Value', [[priceUpdateTxn, getAccountCollateralTxn]]),
    value: priceUpdateTxn.value,
  });
  console.timeEnd('fetchAccountCollateralWithPriceUpdate');
  console.log({ response });

  if (response) {
    const decodedMulticall = MulticallInterface.decodeFunctionResult('aggregate3Value', response);
    console.log({ decodedMulticall });
    if (decodedMulticall?.returnData?.[1]?.returnData) {
      const getAccountCollateralTxnData = decodedMulticall.returnData[1].returnData;
      console.log({ getAccountCollateralTxnData });
      const accountCollateral = CoreProxyInterface.decodeFunctionResult('getAccountCollateral', getAccountCollateralTxnData);
      return {
        totalAssigned: accountCollateral.totalAssigned,
        totalDeposited: accountCollateral.totalDeposited,
        totalLocked: accountCollateral.totalLocked,
      };
    }
    console.error({ decodedMulticall });
    throw new Error('Unexpected multicall response');
  }
  throw new Error('Empty multicall response');
}
