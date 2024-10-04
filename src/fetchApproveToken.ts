import { ethers } from 'ethers';

export async function fetchApproveToken({
  provider,
  walletAddress,
  tokenAddress,
  spenderAddress,
  allowance,
}: {
  provider: ethers.providers.Web3Provider;
  walletAddress: string;
  tokenAddress: ethers.BigNumberish;
  spenderAddress: ethers.BigNumberish;
  allowance: ethers.BigNumberish;
}) {
  const signer = provider.getSigner(walletAddress);
  const Token = new ethers.Contract(tokenAddress.toString(), ['function approve(address spender, uint256 amount) returns (bool)'], signer);
  const tx: ethers.ContractTransaction = await Token.approve(spenderAddress, allowance);
  console.log({ tx });
  const txResult = await tx.wait();
  console.log({ txResult });
  return txResult;
}
