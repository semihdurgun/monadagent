// /lib/native.ts
import { type Address, parseEther } from 'viem';
import { publicClient } from './viem';
import { monadTestnet } from './chain';
import { getWalletClientWithAccount } from './smartAccount';
import { createHybridSmartAccount } from './smartAccount';

export async function getNativeBalance(addr: Address) {
    return publicClient.getBalance({ address: addr });
}

export async function fundSmartAccount(amountMon: string) {
    const { walletClient, owner } = await getWalletClientWithAccount();

    const sa = await createHybridSmartAccount();

    const hash = await walletClient.sendTransaction({
        chain: monadTestnet,
        account: owner,
        to: sa.address as Address,
        value: parseEther(amountMon),
    });

    return { txHash: hash, saAddress: sa.address, eoa: owner };
}
