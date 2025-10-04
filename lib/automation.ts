import {
    createDelegation,
    createExecution,
    ExecutionMode,
} from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import { encodeFunctionData, parseUnits } from 'viem';
import { erc20Abi } from './erc20abi';
import { createHybridSmartAccount } from './smartAccount';

export interface DigitalWillConfig {
    id: string;
    name: string;
    beneficiaries: {
        address: `0x${string}`;
        percentage: number; // 0-100
    }[];
    inactivityPeriod: number; // days
    executors: `0x${string}`[]; // addresses that can trigger the will
    tokens: `0x${string}`[]; // tokens to be distributed
}

export interface ScheduledPaymentConfig {
    id: string;
    name: string;
    recipient: `0x${string}`;
    token: `0x${string}`;
    amount: string;
    decimals: number;
    schedule: {
        type: 'daily' | 'weekly' | 'monthly' | 'yearly';
        dayOfMonth?: number; // for monthly/yearly
        dayOfWeek?: number; // for weekly (0-6, Sunday = 0)
    };
    startDate: number; // timestamp
    endDate?: number; // timestamp, optional
    maxPayments?: number; // optional limit
}

export interface DigitalWill {
    id: string;
    config: DigitalWillConfig;
    delegation: any;
    signature: `0x${string}`;
    createdAt: number;
    lastActivity: number;
    isActive: boolean;
}

export interface ScheduledPayment {
    id: string;
    config: ScheduledPaymentConfig;
    delegation: any;
    signature: `0x${string}`;
    createdAt: number;
    nextExecution: number;
    executionsCount: number;
    isActive: boolean;
}

declare global {
    interface Window {
        ethereum?: any;
    }
}

/**
 * Create a digital will delegation
 */
export async function createDigitalWill(config: DigitalWillConfig): Promise<{
    digitalWill: DigitalWill;
    delegation: any;
    summary: any;
}> {
    const sa = await createHybridSmartAccount();
    
    // Calculate total percentage
    const totalPercentage = config.beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
    if (totalPercentage !== 100) {
        throw new Error('Toplam yüzde 100 olmalıdır');
    }

    // Create caveats for digital will
    const inactivitySeconds = config.inactivityPeriod * 24 * 60 * 60;
    const caveats: any[] = [
        {
            type: 'INACTIVITY_PERIOD',
            value: inactivitySeconds,
        },
        {
            type: 'REQUIRED_EXECUTORS',
            value: config.executors,
        },
        {
            type: 'ALLOWED_METHODS',
            value: ['transfer'],
        },
    ];

    // Create delegations for each beneficiary
    const delegations = [];
    
    for (const beneficiary of config.beneficiaries) {
        for (const token of config.tokens) {
            // Calculate amount based on percentage (this would need actual balance)
            const maxAmount = parseUnits('1000000', 6); // Mock amount
            
            const delegation = createDelegation({
                from: sa.address,
                to: beneficiary.address,
                environment: sa.environment,
                scope: {
                    type: 'erc20TransferAmount',
                    tokenAddress: token,
                    maxAmount,
                },
                caveats,
            });

            delegations.push({
                delegation,
                beneficiary: beneficiary.address,
                token,
                percentage: beneficiary.percentage,
            });
        }
    }

    // Sign all delegations
    const signedDelegations = [];
    for (const { delegation } of delegations) {
        const signature = await sa.signDelegation({ delegation });
        signedDelegations.push({ ...delegation, signature });
    }

    const digitalWill: DigitalWill = {
        id: config.id,
        config,
        delegation: signedDelegations[0], // Primary delegation
        signature: signedDelegations[0].signature,
        createdAt: Math.floor(Date.now() / 1000),
        lastActivity: Math.floor(Date.now() / 1000),
        isActive: true,
    };

    return {
        digitalWill,
        delegation: signedDelegations[0],
        summary: {
            id: config.id,
            beneficiaries: config.beneficiaries,
            inactivityPeriod: config.inactivityPeriod,
            executors: config.executors,
            delegations: signedDelegations,
        },
    };
}

/**
 * Execute digital will (called by executors after inactivity period)
 */
export async function executeDigitalWill(
    willId: string,
    executorAddress: `0x${string}`
): Promise<`0x${string}`[]> {
    if (!window.ethereum) throw new Error('MetaMask bulunamadı');

    // This would typically check:
    // 1. Inactivity period has passed
    // 2. Executor is authorized
    // 3. Will is still active
    
    const [from] = await window.ethereum.request({
        method: 'eth_requestAccounts',
    });

    if (from.toLowerCase() !== executorAddress.toLowerCase()) {
        throw new Error('Yetkisiz executor');
    }

    // Execute all delegations in the will
    const txHashes: `0x${string}`[] = [];
    
    // This would iterate through all signed delegations and execute them
    // For now, return mock transaction hashes
    return txHashes;
}

/**
 * Create scheduled payment delegation
 */
export async function createScheduledPayment(config: ScheduledPaymentConfig): Promise<{
    scheduledPayment: ScheduledPayment;
    delegation: any;
    summary: any;
}> {
    const sa = await createHybridSmartAccount();
    const amount = parseUnits(config.amount, config.decimals);

    // Calculate next execution time
    const nextExecution = calculateNextExecution(config.schedule, config.startDate);

    // Create caveats for scheduled payment
    const caveats: any[] = [
        {
            type: 'SPEND_LIMIT',
            value: {
                amount: amount.toString(),
                token: config.token,
                period: getSchedulePeriodSeconds(config.schedule.type),
            },
        },
        {
            type: 'ALLOWED_METHODS',
            value: ['transfer'],
        },
        {
            type: 'ALLOWED_RECIPIENTS',
            value: [config.recipient],
        },
    ];

    // Add max payments limit if specified
    if (config.maxPayments) {
        caveats.push({
            type: 'MAX_USES',
            value: config.maxPayments,
        });
    }

    // Add end date if specified
    if (config.endDate) {
        caveats.push({
            type: 'EXPIRATION',
            value: config.endDate,
        });
    }

    const delegation = createDelegation({
        from: sa.address,
        to: config.recipient,
        environment: sa.environment,
        scope: {
            type: 'erc20TransferAmount',
            tokenAddress: config.token,
            maxAmount: amount,
        },
        caveats,
    });

    const signature = await sa.signDelegation({ delegation });

    const scheduledPayment: ScheduledPayment = {
        id: config.id,
        config,
        delegation: { ...delegation, signature },
        signature: signature as `0x${string}`,
        createdAt: Math.floor(Date.now() / 1000),
        nextExecution,
        executionsCount: 0,
        isActive: true,
    };

    return {
        scheduledPayment,
        delegation: { ...delegation, signature },
        summary: {
            id: config.id,
            recipient: config.recipient,
            amount: config.amount,
            schedule: config.schedule,
            nextExecution,
        },
    };
}

/**
 * Execute scheduled payment (called by automation service)
 */
export async function executeScheduledPayment(
    paymentId: string,
    automationServiceAddress: `0x${string}`
): Promise<`0x${string}`> {
    if (!window.ethereum) throw new Error('MetaMask bulunamadı');

    // This would be called by an automation service like Chainlink Automation
    // The service would verify the schedule and execute the payment
    
    const [from] = await window.ethereum.request({
        method: 'eth_requestAccounts',
    });

    // Verify it's the authorized automation service
    if (from.toLowerCase() !== automationServiceAddress.toLowerCase()) {
        throw new Error('Yetkisiz automation servisi');
    }

    // Execute the scheduled payment delegation
    // This would use the same pattern as other delegation executions
    return '0x' as `0x${string}`; // Mock transaction hash
}

/**
 * Calculate next execution time based on schedule
 */
function calculateNextExecution(schedule: ScheduledPaymentConfig['schedule'], startDate: number): number {
    const now = Math.floor(Date.now() / 1000);
    const start = new Date(startDate * 1000);
    
    switch (schedule.type) {
        case 'daily':
            return now + (24 * 60 * 60);
        case 'weekly':
            const nextWeek = new Date(start);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return Math.floor(nextWeek.getTime() / 1000);
        case 'monthly':
            const nextMonth = new Date(start);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            if (schedule.dayOfMonth) {
                nextMonth.setDate(schedule.dayOfMonth);
            }
            return Math.floor(nextMonth.getTime() / 1000);
        case 'yearly':
            const nextYear = new Date(start);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            return Math.floor(nextYear.getTime() / 1000);
        default:
            return now + (24 * 60 * 60);
    }
}

/**
 * Get schedule period in seconds
 */
function getSchedulePeriodSeconds(type: ScheduledPaymentConfig['schedule']['type']): number {
    switch (type) {
        case 'daily':
            return 24 * 60 * 60;
        case 'weekly':
            return 7 * 24 * 60 * 60;
        case 'monthly':
            return 30 * 24 * 60 * 60;
        case 'yearly':
            return 365 * 24 * 60 * 60;
        default:
            return 24 * 60 * 60;
    }
}

/**
 * Check if inactivity period has passed for digital will
 */
export function checkInactivityPeriod(digitalWill: DigitalWill): boolean {
    const now = Math.floor(Date.now() / 1000);
    const inactivitySeconds = digitalWill.config.inactivityPeriod * 24 * 60 * 60;
    return (now - digitalWill.lastActivity) >= inactivitySeconds;
}

/**
 * Get time until next scheduled payment
 */
export function getTimeUntilNextPayment(scheduledPayment: ScheduledPayment): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, scheduledPayment.nextExecution - now);
}

/**
 * Format time until next payment as human readable string
 */
export function formatTimeUntilNextPayment(seconds: number): string {
    if (seconds <= 0) return 'Şimdi';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
        return `${days}g ${hours}s ${minutes}dk`;
    } else if (hours > 0) {
        return `${hours}s ${minutes}dk`;
    } else {
        return `${minutes}dk`;
    }
}
