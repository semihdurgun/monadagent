import {
    createDelegation,
    createExecution,
    ExecutionMode,
} from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import { encodeFunctionData, parseUnits } from 'viem';
import { erc20Abi } from './erc20abi';
import { createHybridSmartAccount } from './smartAccount';

export interface OneTimePaymentConfig {
    id: string;
    merchant: `0x${string}`;
    token: `0x${string}`;
    amount: string;
    decimals: number;
    validForMinutes: number; // How long the payment card is valid
    description?: string;
}

export interface PaymentCard {
    id: string;
    config: OneTimePaymentConfig;
    delegation: any;
    signature: `0x${string}`;
    createdAt: number;
    expiresAt: number;
    isUsed: boolean;
    usedAt?: number;
}

declare global {
    interface Window {
        ethereum?: any;
    }
}

/**
 * Create a one-time payment card (delegation with strict caveats)
 */
export async function createOneTimePaymentCard(config: OneTimePaymentConfig): Promise<{
    paymentCard: PaymentCard;
    delegation: any;
    summary: any;
}> {
    const sa = await createHybridSmartAccount();
    const amount = parseUnits(config.amount, config.decimals);
    const expiresAt = Math.floor(Date.now() / 1000) + (config.validForMinutes * 60);

    // Create strict caveats for one-time payment
    const caveats: any[] = [
        {
            type: 'SPEND_LIMIT',
            value: {
                amount: amount.toString(),
                token: config.token,
                period: 1, // Single use period
            },
        },
        {
            type: 'MAX_USES',
            value: 1, // Can only be used once
        },
        {
            type: 'EXPIRATION',
            value: expiresAt,
        },
        {
            type: 'ALLOWED_METHODS',
            value: ['transfer'], // Only allow transfer method
        },
        {
            type: 'ALLOWED_RECIPIENTS',
            value: [config.merchant], // Only allow payment to this specific merchant
        },
    ];

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

    const paymentCard: PaymentCard = {
        id: config.id,
        config,
        delegation: { ...delegation, signature },
        signature: signature as `0x${string}`,
        createdAt: Math.floor(Date.now() / 1000),
        expiresAt,
        isUsed: false,
    };

    return {
        paymentCard,
        delegation: { ...delegation, signature },
        summary: {
            id: config.id,
            scopeType: 'erc20TransferAmount' as const,
            token: config.token,
            to: config.merchant,
            maxAmount: amount.toString(),
            signature: signature as `0x${string}`,
            caveats,
            expiresAt,
        },
    };
}

/**
 * Use a one-time payment card (called by merchant)
 */
export async function usePaymentCard(params: {
    signedDelegation: any;
    token: `0x${string}`;
    merchant: `0x${string}`;
    amount: string;
    decimals: number;
}): Promise<`0x${string}`> {
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
 * Check if a payment card is valid (not expired, not used)
 */
export function isPaymentCardValid(paymentCard: PaymentCard): boolean {
    const now = Math.floor(Date.now() / 1000);
    return !paymentCard.isUsed && paymentCard.expiresAt > now;
}

/**
 * Get time remaining for a payment card
 */
export function getPaymentCardTimeRemaining(paymentCard: PaymentCard): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, paymentCard.expiresAt - now);
}

/**
 * Format time remaining as human readable string
 */
export function formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return 'Süresi dolmuş';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes}dk ${remainingSeconds}sn kaldı`;
    }
    return `${remainingSeconds}sn kaldı`;
}

/**
 * Create a QR code data for payment card (for mobile scanning)
 */
export function createPaymentCardQRData(paymentCard: PaymentCard): string {
    return JSON.stringify({
        type: 'one-time-payment',
        id: paymentCard.id,
        merchant: paymentCard.config.merchant,
        amount: paymentCard.config.amount,
        token: paymentCard.config.token,
        expiresAt: paymentCard.expiresAt,
        signature: paymentCard.signature,
    });
}
