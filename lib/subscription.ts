import {
    createDelegation,
    createExecution,
    ExecutionMode,
} from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import { encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { erc20Abi } from './erc20abi';
import { createHybridSmartAccount } from './smartAccount';

export interface SubscriptionConfig {
    id: string;
    name: string;
    merchant: `0x${string}`;
    token: `0x${string}`;
    amount: string;
    decimals: number;
    interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
    maxUses?: number;
    validUntil?: number; // timestamp
}

export interface ActiveSubscription {
    id: string;
    config: SubscriptionConfig;
    delegation: any;
    signature: `0x${string}`;
    createdAt: number;
    lastUsed?: number;
    usageCount: number;
    isActive: boolean;
}

declare global {
    interface Window {
        ethereum?: any;
    }
}

/**
 * Create a subscription delegation with caveats for recurring payments
 */
export async function createSubscriptionDelegation(config: SubscriptionConfig) {
    const sa = await createHybridSmartAccount();
    const amount = parseUnits(config.amount, config.decimals);

    // Convert interval to seconds
    const intervalSeconds = {
        daily: 24 * 60 * 60,
        weekly: 7 * 24 * 60 * 60,
        monthly: 30 * 24 * 60 * 60,
        yearly: 365 * 24 * 60 * 60,
    }[config.interval];

    // Create caveats for subscription control
    const caveats: any[] = [
        {
            type: 'SPEND_LIMIT',
            value: {
                amount: amount.toString(),
                token: config.token,
                period: intervalSeconds,
            },
        },
        {
            type: 'ALLOWED_METHODS',
            value: ['transfer'],
        },
    ];

    // Add max uses caveat if specified
    if (config.maxUses) {
        caveats.push({
            type: 'MAX_USES',
            value: config.maxUses,
        });
    }

    // Add expiration caveat if specified
    if (config.validUntil) {
        caveats.push({
            type: 'EXPIRATION',
            value: config.validUntil,
        });
    }

    const delegation = createDelegation({
        from: sa.address,
        to: config.merchant,
        environment: sa.environment,
        scope: {
            type: 'erc20TransferAmount',
            tokenAddress: config.token,
            maxAmount: amount,
        },
        caveats,
    });

    const signature = await sa.signDelegation({ delegation });

    return {
        delegation: { ...delegation, signature },
        sa,
        summary: {
            id: config.id,
            scopeType: 'erc20TransferAmount' as const,
            token: config.token,
            to: config.merchant,
            maxAmount: amount.toString(),
            signature: signature as `0x${string}`,
            caveats,
        },
    };
}

/**
 * Cancel/revoke a subscription delegation
 */
export async function revokeSubscriptionDelegation(delegationId: string) {
    const sa = await createHybridSmartAccount();
    
    // Create a revoke execution
    const execution = createExecution({
        target: (sa as any).environment.DelegationManager,
        value: 0n,
        callData: encodeFunctionData({
            abi: DelegationManager.abi,
            functionName: 'revokeDelegation',
            args: [delegationId],
        }),
    });

    // Sign and send the revoke transaction
    const txHash = await sa.execute({
        target: (sa as any).environment.DelegationManager,
        value: 0n,
        callData: execution.callData,
    });

    return txHash;
}

/**
 * Execute a subscription payment (called by merchant)
 */
export async function executeSubscriptionPayment(params: {
    signedDelegation: any;
    token: `0x${string}`;
    merchant: `0x${string}`;
    amount: string;
    decimals: number;
}) {
    const { signedDelegation, token, merchant, amount, decimals } = params;

    if (!window.ethereum) throw new Error('No wallet provider found');

    const sa = await createHybridSmartAccount();
    const dmAddress = (sa as any).environment.DelegationManager;

    const value = parseUnits(amount, decimals);
    const callData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [merchant, value],
    });

    const execution = createExecution({
        target: token,
        value: 0n,
        callData,
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
 * Get subscription status and usage info
 */
export async function getSubscriptionStatus(subscriptionId: string): Promise<{
    isActive: boolean;
    usageCount: number;
    lastUsed?: number;
    remainingUses?: number;
    expiresAt?: number;
}> {
    // This would typically query on-chain data or your backend
    // For now, return mock data
    return {
        isActive: true,
        usageCount: 0,
        remainingUses: undefined,
        expiresAt: undefined,
    };
}
