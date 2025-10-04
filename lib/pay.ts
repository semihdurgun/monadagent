import { bundlerClient } from './viem';
import { encodeFunctionData, parseAbi, parseUnits } from 'viem';
import { createHybridSmartAccount } from './smartAccount';
import { getTokenInfo } from './erc20';
import { getFees } from './gas';

const erc20Abi = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
]);

export async function payMerchant({
    token,
    merchant,
    amount,
}: {
    token: `0x${string}`;
    merchant: `0x${string}`;
    amount: string;
}) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(merchant))
        throw new Error('Invalid merchant address');

    const sa = await createHybridSmartAccount();
    const { decimals } = await getTokenInfo(token);
    const amountWei = parseUnits(amount, decimals);
    const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [merchant, amountWei],
    });
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
