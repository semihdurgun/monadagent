import {
    createDelegation,
    createExecution,
    ExecutionMode,
} from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import { encodeFunctionData, parseUnits } from 'viem';
import { createHybridSmartAccount } from './smartAccount';

export interface NativeDelegationConfig {
    id: string;
    name: string;
    recipient: `0x${string}`;
    amount: string; // in MON (native token)
    interval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    maxUses?: number;
    validUntil?: number; // timestamp
    isSubscription?: boolean;
}

export interface NativeDelegation {
    id: string;
    config: NativeDelegationConfig;
    delegation: any;
    signature: `0x${string}`;
    createdAt: number;
    usageCount: number;
    isActive: boolean;
}

declare global {
    interface Window {
        ethereum?: any;
    }
}

/**
 * Create a native MON delegation
 */
export async function createNativeDelegation(config: NativeDelegationConfig): Promise<{
    delegation: any;
    summary: any;
}> {
    const sa = await createHybridSmartAccount();
    const amount = parseUnits(config.amount, 18); // MON has 18 decimals

    // Create caveats based on delegation type
    const caveats: any[] = [
        {
            type: 'ALLOWED_METHODS',
            value: ['transfer'],
        },
    ];

    if (config.isSubscription && config.interval) {
        // Subscription caveats
        const intervalSeconds = {
            daily: 24 * 60 * 60,
            weekly: 7 * 24 * 60 * 60,
            monthly: 30 * 24 * 60 * 60,
            yearly: 365 * 24 * 60 * 60,
        }[config.interval];

        caveats.push({
            type: 'SPEND_LIMIT',
            value: {
                amount: amount.toString(),
                period: intervalSeconds,
            },
        });

        if (config.maxUses) {
            caveats.push({
                type: 'MAX_USES',
                value: config.maxUses,
            });
        }
    } else {
        // One-time payment caveats
        caveats.push({
            type: 'SPEND_LIMIT',
            value: {
                amount: amount.toString(),
                period: 1, // Single use
            },
        });
        caveats.push({
            type: 'MAX_USES',
            value: 1,
        });
    }

    if (config.validUntil) {
        caveats.push({
            type: 'EXPIRATION',
            value: config.validUntil,
        });
    }

    caveats.push({
        type: 'ALLOWED_RECIPIENTS',
        value: [config.recipient],
    });

    const delegation = createDelegation({
        from: sa.address,
        to: config.recipient,
        environment: sa.environment,
        scope: {
            type: 'nativeTokenTransferAmount',
            maxAmount: amount,
        },
        caveats,
    });

    const signature = await sa.signDelegation({ delegation });

    return {
        delegation: { ...delegation, signature },
        summary: {
            id: config.id,
            scopeType: 'nativeTokenTransferAmount',
            to: config.recipient,
            maxAmount: amount.toString(),
            signature: signature as `0x${string}`,
            caveats,
        },
    };
}

/**
 * Execute native delegation (called by recipient)
 */
export async function executeNativeDelegation(params: {
    signedDelegation: any;
    recipient: `0x${string}`;
    amount: string;
}): Promise<`0x${string}`> {
    const { signedDelegation, recipient, amount } = params;

    if (!window.ethereum) throw new Error('MetaMask bulunamadı');

    const sa = await createHybridSmartAccount();
    const dmAddress = (sa as any).environment.DelegationManager;

    const value = parseUnits(amount, 18);
    
    // For native transfers, we need to use the smart account's execute method
    // This would transfer native MON from the smart account to the recipient
    const execution = createExecution({
        target: recipient,
        value,
        callData: '0x', // Empty call data for native transfer
    });

    const redeemData = DelegationManager.encode.redeemDelegations({
        delegations: [[signedDelegation]],
        modes: [ExecutionMode.SingleDefault],
        executions: [[execution]],
    });

    const [from] = await window.ethereum.request({
        method: 'eth_requestAccounts',
    });
    
    const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [
            {
                from,
                to: dmAddress,
                data: redeemData,
            },
        ],
    });

    return txHash as `0x${string}`;
}

/**
 * Revoke a native delegation
 */
export async function revokeNativeDelegation(delegationId: string): Promise<`0x${string}`> {
    const sa = await createHybridSmartAccount();
    
    // For now, return a mock transaction hash
    // In a real implementation, this would use the smart account's execute method
    // to call the delegation manager's revokeDelegation function
    return '0x' as `0x${string}`;
}

/**
 * Create subscription delegation for native MON
 */
export async function createNativeSubscription(config: {
    id: string;
    name: string;
    recipient: `0x${string}`;
    amount: string;
    interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
    maxUses?: number;
    validUntil?: number;
}): Promise<{
    delegation: any;
    summary: any;
}> {
    return createNativeDelegation({
        ...config,
        isSubscription: true,
    });
}

/**
 * Create one-time payment delegation for native MON
 */
export async function createNativeOneTimePayment(config: {
    id: string;
    name: string;
    recipient: `0x${string}`;
    amount: string;
    validForMinutes: number;
}): Promise<{
    delegation: any;
    summary: any;
}> {
    const validUntil = Math.floor(Date.now() / 1000) + (config.validForMinutes * 60);
    
    return createNativeDelegation({
        ...config,
        isSubscription: false,
        validUntil,
    });
}
