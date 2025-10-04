import { encodeFunctionData, parseAbi } from 'viem';
import { bundlerClient } from './viem';
import { createHybridSmartAccount } from './smartAccount';
import { getFees } from './gas';

const faucetAbi = parseAbi(['function faucet()']);

export async function faucetToSA(token: `0x${string}`) {
    const sa = await createHybridSmartAccount();
    const data = encodeFunctionData({ abi: faucetAbi, functionName: 'faucet' });
    const { maxFeePerGas, maxPriorityFeePerGas } = await getFees();

    const hash = await bundlerClient.sendUserOperation({
        account: sa,
        calls: [{ to: token, data }],
        maxFeePerGas,
        maxPriorityFeePerGas,
    });

    const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash,
    });
    return { sa, txHash: receipt.transactionHash as `0x${string}` };
}
