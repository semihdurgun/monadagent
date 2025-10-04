import { bundlerClient } from './viem';
import { createHybridSmartAccount } from './smartAccount';
import { getFees } from './gas';

export async function pingUserOp() {
    const sa = await createHybridSmartAccount();
    const { maxFeePerGas, maxPriorityFeePerGas } = await getFees();

    const hash = await bundlerClient.sendUserOperation({
        account: sa,
        calls: [{ to: sa.address, data: '0x' }],
        maxFeePerGas,
        maxPriorityFeePerGas,
    });

    const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash,
    });
    return { sa, txHash: receipt.transactionHash as `0x${string}` };
}
