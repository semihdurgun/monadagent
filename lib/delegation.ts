// /lib/delegation.ts
import {
    createDelegation,
    createExecution,
    ExecutionMode,
} from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import { encodeFunctionData, parseUnits } from 'viem';
import { erc20Abi } from './erc20abi';
import { createHybridSmartAccount } from './smartAccount'; // your existing SA loader

type CreateDelegationParams = {
    token: `0x${string}`;
    amount: string; // human, e.g. "6"
    merchant: `0x${string}`; // delegate EOA (puller + receiver)
    decimals: number;
};

declare global {
    interface Window {
        ethereum?: any;
    }
}

/** Try to discover DelegationManager address from the SA environment. */
function resolveDelegationManagerAddress(saEnv: any): `0x${string}` {
    const fallback = process.env.NEXT_PUBLIC_DELEGATION_MANAGER as
        | `0x${string}`
        | undefined;

    // Try a few shapes that various DTK builds use:
    const candidates = [
        saEnv?.DelegationManager, // direct
        saEnv?.addresses?.DelegationManager, // { addresses: { DelegationManager } }
        saEnv?.contracts?.DelegationManager?.address, // { contracts: { DelegationManager: { address } } }
    ].filter(Boolean);

    const addr = (candidates[0] as `0x${string}` | undefined) ?? fallback;
    if (!addr) {
        throw new Error(
            'DelegationManager address not found. Set NEXT_PUBLIC_DELEGATION_MANAGER in .env.local'
        );
    }
    return addr;
}

/**
 * Create & sign a scoped ERC20 delegation (SA -> merchant EOA).
 * Scope: erc20TransferAmount (max total allowance = amount).
 */
export async function createAndSignDelegation({
    token,
    amount,
    merchant,
    decimals,
}: CreateDelegationParams) {
    const sa = await createHybridSmartAccount();
    const maxAmount = parseUnits(amount, decimals);

    const delegation = createDelegation({
        from: sa.address,
        to: merchant,
        environment: sa.environment,
        scope: {
            type: 'erc20TransferAmount',
            tokenAddress: token,
            maxAmount,
        },
    });

    const signature = await sa.signDelegation({ delegation });

    const summary = {
        scopeType: 'erc20TransferAmount' as const,
        token,
        to: merchant,
        maxAmount: maxAmount.toString(),
        signature: signature as `0x${string}`,
    };

    return {
        signedDelegation: { ...delegation, signature },
        sa,
        summary,
    };
}

/**
 * Delegate (merchant EOA) redeems the delegation by calling DelegationManager.redeemDelegations
 * with an execution that calls `token.transfer(merchant, amount)`.
 * Encoded via Toolkit's static encoder; tx sent from window.ethereum.
 */
export async function redeemDelegationWithEOA(params: {
    signedDelegation: any;
    token: `0x${string}`;
    merchant: `0x${string}`;
    amount: string;
    decimals: number;
}) {
    const { signedDelegation, token, merchant, amount, decimals } = params;

    if (!window.ethereum) throw new Error('No wallet provider found');

    // Re-load SA to access the environment for address resolution
    const sa = await createHybridSmartAccount();
    const dmAddress = resolveDelegationManagerAddress((sa as any).environment);

    // Prepare the token.transfer(merchant, amount) call as an Execution
    const value = parseUnits(amount, decimals);
    const callData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [merchant, value],
    });

    const execution = createExecution({
        target: token,
        value: 0n,
        callData, // NOTE: your DTK expects "callData" (not "data")
    });

    // Build redeem calldata using the static encoder (no env types required)
    const redeemData = DelegationManager.encode.redeemDelegations({
        delegations: [[signedDelegation]], // single chain / single delegation batch
        modes: [ExecutionMode.SingleDefault], // single execution
        executions: [[execution]], // executes ERC20.transfer
    });

    // Send tx from the delegate (merchant) EOA
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
