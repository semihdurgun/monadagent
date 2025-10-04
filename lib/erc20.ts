// /lib/erc20.ts
import { publicClient } from './viem';
import { parseAbi, formatUnits } from 'viem';

const erc20Abi = parseAbi([
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
]);

export async function getTokenInfo(token: `0x${string}`) {
    const [decimals, symbol] = await Promise.all([
        publicClient.readContract({
            address: token,
            abi: erc20Abi,
            functionName: 'decimals',
        }),
        publicClient.readContract({
            address: token,
            abi: erc20Abi,
            functionName: 'symbol',
        }),
    ]);
    return { decimals: Number(decimals), symbol };
}

export async function getBalanceOf(token: `0x${string}`, addr: `0x${string}`) {
    const balance = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [addr],
    });
    return balance as bigint;
}

export function formatToken(amountWei: bigint, decimals = 18) {
    return formatUnits(amountWei, decimals);
}
