import { defineChain } from 'viem';

export const monadTestnet = defineChain({
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } },
    blockExplorers: {
        default: { name: 'Monad', url: 'https://testnet.monadexplorer.com' },
    },
    contracts: {
        entryPoint: {
            address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
        },
    },
});
