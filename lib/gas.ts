import { publicClient } from './viem';

export async function getFees() {
    // Bundler minimum requirements
    const minMaxFeePerGas = 80_000_000_000n; // 80 gwei (above bundler minimum of 77.5 gwei)
    const minMaxPriorityFeePerGas = 2_500_000_000n; // 2.5 gwei (bundler minimum)

    try {
        // Try to get gas prices from Pimlico API first
        const response = await fetch('https://api.pimlico.io/v2/monad-testnet/rpc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'pimlico_getUserOperationGasPrice',
                params: [],
                id: 1,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.result && data.result.standard) {
                return {
                    maxFeePerGas: BigInt(data.result.standard.maxFeePerGas),
                    maxPriorityFeePerGas: BigInt(data.result.standard.maxPriorityFeePerGas),
                };
            }
        }
    } catch (error) {
        console.log('Pimlico gas price API failed, falling back to RPC');
    }

    try {
        // Fallback to RPC gas estimation
        const fees = await publicClient.estimateFeesPerGas();

        let maxPriorityFeePerGas =
            fees.maxPriorityFeePerGas ??
            (await publicClient
                .estimateMaxPriorityFeePerGas()
                .catch(() => undefined)) ??
            minMaxPriorityFeePerGas;

        let maxFeePerGas =
            fees.maxFeePerGas ??
            (fees.gasPrice
                ? fees.gasPrice + maxPriorityFeePerGas
                : maxPriorityFeePerGas * 40n);

        // Ensure minimum gas prices for bundler
        maxFeePerGas = maxFeePerGas > minMaxFeePerGas ? maxFeePerGas : minMaxFeePerGas;
        maxPriorityFeePerGas = maxPriorityFeePerGas > minMaxPriorityFeePerGas ? maxPriorityFeePerGas : minMaxPriorityFeePerGas;

        return { maxFeePerGas, maxPriorityFeePerGas };
    } catch (error) {
        console.log('RPC gas estimation failed, using minimum values');
        return { 
            maxFeePerGas: minMaxFeePerGas, 
            maxPriorityFeePerGas: minMaxPriorityFeePerGas 
        };
    }
}
