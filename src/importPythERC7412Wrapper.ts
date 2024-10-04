export async function importPythERC7412Wrapper(chainId: number, preset: string): Promise<{ address: string; abi: string[] }> {
  const deployment = `${Number(chainId).toFixed(0)}-${preset}`;
  switch (deployment) {
    case '8453-andromeda': {
      const [{ default: meta }, { default: abi }] = await Promise.all([
        import('@synthetixio/v3-contracts/8453-andromeda/meta.json'),
        import('@synthetixio/v3-contracts/8453-andromeda/PythERC7412Wrapper.readable.json'),
      ]);
      return { address: meta.contracts.PythERC7412Wrapper, abi };
    }
    case '84532-andromeda': {
      const [{ default: meta }, { default: abi }] = await Promise.all([
        import('@synthetixio/v3-contracts/84532-andromeda/meta.json'),
        import('@synthetixio/v3-contracts/84532-andromeda/PythERC7412Wrapper.readable.json'),
      ]);
      return { address: meta.contracts.PythERC7412Wrapper, abi };
    }
    case '42161-main': {
      const [{ default: meta }, { default: abi }] = await Promise.all([
        import('@synthetixio/v3-contracts/42161-main/meta.json'),
        import('@synthetixio/v3-contracts/42161-main/PythERC7412Wrapper.readable.json'),
      ]);
      return { address: meta.contracts.PythERC7412Wrapper, abi };
    }
    case '421614-main': {
      const [{ default: meta }, { default: abi }] = await Promise.all([
        import('@synthetixio/v3-contracts/421614-main/meta.json'),
        import('@synthetixio/v3-contracts/421614-main/PythERC7412Wrapper.readable.json'),
      ]);
      return { address: meta.contracts.PythERC7412Wrapper, abi };
    }
    default: {
      throw new Error(`Unsupported deployment ${deployment} for PythERC7412Wrapper`);
    }
  }
}
