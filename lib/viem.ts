// /lib/viem.ts
import { createPublicClient, http } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';
import { monadTestnet } from '@/lib/chain';

const RPC = 'https://testnet-rpc.monad.xyz';
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL!;

export const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(RPC),
});

export const bundlerClient = createBundlerClient({
    chain: monadTestnet,
    transport: http(BUNDLER_URL),
});
