import {
    toMetaMaskSmartAccount,
    Implementation,
    createExecution,
    ExecutionMode,
} from '@metamask/delegation-toolkit';
import { createWalletClient, custom, parseUnits, encodeFunctionData } from 'viem';
import { monadTestnet } from './chain';
import { publicClient } from './viem';

export interface SharedPotConfig {
    id: string;
    name: string;
    description?: string;
    members: `0x${string}`[];
    threshold: number; // How many signatures needed (e.g., 2 out of 3)
    token?: `0x${string}`; // Optional: specific token for this pot
}

export interface SharedPot {
    id: string;
    config: SharedPotConfig;
    smartAccountAddress: `0x${string}`;
    balance: bigint;
    createdAt: number;
    isActive: boolean;
    transactions: SharedPotTransaction[];
}

export interface SharedPotTransaction {
    id: string;
    from: `0x${string}`;
    to: `0x${string}`;
    amount: bigint;
    token?: `0x${string}`;
    description: string;
    status: 'pending' | 'executed' | 'rejected';
    signatures: `0x${string}`[];
    createdAt: number;
    executedAt?: number;
}

declare global {
    interface Window {
        ethereum?: any;
    }
}

/**
 * Create a multisig smart account for shared pot
 */
export async function createSharedPot(config: SharedPotConfig): Promise<{
    sharedPot: SharedPot;
    smartAccount: any;
}> {
    if (config.members.length < 2) {
        throw new Error('En az 2 üye gereklidir');
    }

    if (config.threshold < 1 || config.threshold > config.members.length) {
        throw new Error('Threshold geçerli değil');
    }

    // Create wallet client
    const eth = (window as any).ethereum;
    if (!eth) throw new Error('MetaMask bulunamadı');
    
    const [account] = await eth.request({
        method: 'eth_requestAccounts',
    });

    const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(eth),
        account: account as `0x${string}`,
    });

    // Create multisig smart account
    const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.MultiSig,
        deployParams: [
            config.members, // owners
            BigInt(config.threshold), // convert threshold to bigint
        ],
        deploySalt: `0x${BigInt(config.id).toString(16)}`, // convert id to bigint and format as hex
        signer: { walletClient } as any,
    });

    const sharedPot: SharedPot = {
        id: config.id,
        config,
        smartAccountAddress: smartAccount.address,
        balance: 0n,
        createdAt: Math.floor(Date.now() / 1000),
        isActive: true,
        transactions: [],
    };

    return { sharedPot, smartAccount };
}

/**
 * Add funds to shared pot (direct transfer)
 */
export async function addFundsToSharedPot(
    potAddress: `0x${string}`,
    amount: string,
    token?: `0x${string}`
): Promise<`0x${string}`> {
    if (!window.ethereum) throw new Error('MetaMask bulunamadı');

    const [from] = await window.ethereum.request({
        method: 'eth_requestAccounts',
    });

    if (token) {
        // ERC20 token transfer
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [
                {
                    from,
                    to: token,
                    data: encodeFunctionData({
                        abi: [
                            {
                                name: 'transfer',
                                type: 'function',
                                inputs: [
                                    { name: 'to', type: 'address' },
                                    { name: 'amount', type: 'uint256' },
                                ],
                            },
                        ],
                        functionName: 'transfer',
                        args: [potAddress, parseUnits(amount, 6)], // Assuming 6 decimals
                    }),
                },
            ],
        });
        return txHash as `0x${string}`;
    } else {
        // Native token transfer
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [
                {
                    from,
                    to: potAddress,
                    value: parseUnits(amount, 18).toString(16), // Convert to hex
                },
            ],
        });
        return txHash as `0x${string}`;
    }
}

/**
 * Execute a transaction when threshold is reached
 */
export async function executeSharedPotTransaction(
    potAddress: `0x${string}`,
    transactionData: any,
    signatures: `0x${string}`[]
): Promise<`0x${string}`> {
    if (!window.ethereum) throw new Error('MetaMask bulunamadı');

    const [from] = await window.ethereum.request({
        method: 'eth_requestAccounts',
    });

    let callData: `0x${string}`;
    let target: `0x${string}`;

    if (transactionData.token) {
        // ERC20 transfer
        target = transactionData.token;
        callData = encodeFunctionData({
            abi: [
                {
                    name: 'transfer',
                    type: 'function',
                    inputs: [
                        { name: 'to', type: 'address' },
                        { name: 'amount', type: 'uint256' },
                    ],
                },
            ],
            functionName: 'transfer',
            args: [transactionData.to, transactionData.amount],
        });
    } else {
        // Native transfer - this would need to be handled by the multisig contract
        throw new Error('Native transfers not implemented yet');
    }

    // Execute through multisig contract
    const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [
            {
                from,
                to: potAddress,
                data: encodeFunctionData({
                    abi: [
                        {
                            name: 'executeTransaction',
                            type: 'function',
                            inputs: [
                                { name: 'target', type: 'address' },
                                { name: 'value', type: 'uint256' },
                                { name: 'data', type: 'bytes' },
                                { name: 'signatures', type: 'bytes[]' },
                            ],
                        },
                    ],
                    functionName: 'executeTransaction',
                    args: [target, 0n, callData, signatures],
                }),
            },
        ],
    });

    return txHash as `0x${string}`;
}

/**
 * Get shared pot balance
 */
export async function getSharedPotBalance(
    potAddress: `0x${string}`,
    token?: `0x${string}`
): Promise<bigint> {
    if (token) {
        // Get ERC20 balance
        const balance = await publicClient.readContract({
            address: token,
            abi: [
                {
                    name: 'balanceOf',
                    type: 'function',
                    inputs: [{ name: 'account', type: 'address' }],
                    outputs: [{ name: '', type: 'uint256' }],
                },
            ],
            functionName: 'balanceOf',
            args: [potAddress],
        });
        return balance as bigint;
    } else {
        // Get native balance
        const balance = await publicClient.getBalance({
            address: potAddress,
        });
        return balance;
    }
}

/**
 * List all transactions for a shared pot
 */
export function getSharedPotTransactions(potId: string): SharedPotTransaction[] {
    // This would typically query your backend or on-chain data
    // For now, return mock data
    return [];
}
