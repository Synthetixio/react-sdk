export async function importSystemToken(
  chainId: number,
  preset: string
): Promise<{
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}> {
  const deployment = `${Number(chainId).toFixed(0)}-${preset}`;
  switch (deployment) {
    case '1-main': {
      const [{ default: systemToken }] = await Promise.all([import('@synthetixio/v3-contracts/1-main/systemToken.json')]);
      return systemToken;
    }
    case '11155111-main': {
      const [{ default: systemToken }] = await Promise.all([import('@synthetixio/v3-contracts/11155111-main/systemToken.json')]);
      return systemToken;
    }
    case '10-main': {
      const [{ default: systemToken }] = await Promise.all([import('@synthetixio/v3-contracts/10-main/systemToken.json')]);
      return systemToken;
    }
    case '8453-andromeda': {
      const [{ default: systemToken }] = await Promise.all([import('@synthetixio/v3-contracts/8453-andromeda/systemToken.json')]);
      return systemToken;
    }
    case '84532-andromeda': {
      const [{ default: systemToken }] = await Promise.all([import('@synthetixio/v3-contracts/84532-andromeda/systemToken.json')]);
      return systemToken;
    }
    case '42161-main': {
      const [{ default: systemToken }] = await Promise.all([import('@synthetixio/v3-contracts/42161-main/systemToken.json')]);
      return systemToken;
    }
    case '421614-main': {
      const [{ default: systemToken }] = await Promise.all([import('@synthetixio/v3-contracts/421614-main/systemToken.json')]);
      return systemToken;
    }
    default: {
      throw new Error(`Unsupported deployment ${deployment} for systemToken`);
    }
  }
}
