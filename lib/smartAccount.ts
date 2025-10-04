// /lib/smartAccount.ts
import { createWalletClient, custom, type Address } from 'viem';
import { monadTestnet } from './chain';
import { publicClient } from './viem';
import {
    Implementation,
    toMetaMaskSmartAccount,
} from '@metamask/delegation-toolkit';

async function requestEOA(): Promise<Address> {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error('MetaMask not found');
    const [addr] = await eth.request({ method: 'eth_requestAccounts' });
    if (!addr) throw new Error('No accounts connected');
    return addr as Address;
}

export async function getWalletClientWithAccount() {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error('MetaMask not found');
    const owner = await requestEOA();

    // IMPORTANT: bind the account here, so signTypedData works
    const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(eth),
        account: owner,
    });
    return { walletClient, owner };
}

export async function createHybridSmartAccount() {
    const { walletClient, owner } = await getWalletClientWithAccount();

    const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [owner, [], [], []], // Hybrid: EOA owner, no passkeys yet
        deploySalt: '0x',
        signer: { walletClient }, // signer now has account
    });

    return smartAccount;
}

// Alternative: Create a hybrid smart account with minimal configuration
export async function createSimpleSmartAccount() {
    const { walletClient, owner } = await getWalletClientWithAccount();

    const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [owner, [], [], []], // Hybrid: EOA owner, no passkeys
        deploySalt: '0x',
        signer: { walletClient },
    });

    return smartAccount;
}
