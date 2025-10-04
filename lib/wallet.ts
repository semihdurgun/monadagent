export const MONAD_PARAMS = {
    chainId: '0x279f', // 10143
    chainName: 'Monad Testnet',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://testnet.monadexplorer.com'],
};

export async function ensureMonadNetwork() {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error('MetaMask not found');

    try {
        await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MONAD_PARAMS.chainId }],
        });
    } catch (err: any) {
        if (err?.code === 4902) {
            await eth.request({
                method: 'wallet_addEthereumChain',
                params: [MONAD_PARAMS],
            });
            await eth.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: MONAD_PARAMS.chainId }],
            });
        } else {
            throw err;
        }
    }
}

export async function connectWallet() {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error('MetaMask not found');
    const accounts = await eth.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) throw new Error('No accounts');
    return accounts[0] as `0x${string}`;
}

export async function getCurrentChainId(): Promise<number | undefined> {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const hex = await window.ethereum.request({ method: 'eth_chainId' });
    return typeof hex === 'string' ? parseInt(hex, 16) : undefined;
}

export function listenChainChanged(cb: (id: number) => void) {
    if (typeof window === 'undefined' || !window.ethereum) return () => {};
    const handler = (hex: string) => cb(parseInt(hex, 16));
    window.ethereum.on?.('chainChanged', handler);
    return () => window.ethereum.removeListener?.('chainChanged', handler);
}
