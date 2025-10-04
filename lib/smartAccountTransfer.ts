import { parseUnits } from 'viem';
import { useAppStore } from './store';
import { handleTransactionError } from './errorHandling';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface SmartAccountTransferParams {
  to: `0x${string}`;
  amount: string; // in MON (e.g., "0.1")
}

/**
 * Send native MON tokens from Smart Account
 * Requires Smart Account to be created first
 */
export async function sendNativeMONFromSA(params: SmartAccountTransferParams): Promise<{
  success: boolean;
  txHash?: `0x${string}`;
  error?: string;
}> {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask bulunamadı');
    }

    const { sa } = useAppStore.getState();
    
    if (!sa) {
      throw new Error('Smart Account bulunamadı. Lütfen önce Smart Account oluşturun.');
    }

    // Parse amount to wei (MON has 18 decimals)
    const amountWei = parseUnits(params.amount, 18);

    // Get current account
    const [from] = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    // Send native transfer from Smart Account
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: sa, // Send from Smart Account
          to: params.to,
          value: `0x${amountWei.toString(16)}`, // Convert to hex
          gas: '0x5208', // 21000 gas for simple transfer
        },
      ],
    });

    return {
      success: true,
      txHash: txHash as `0x${string}`,
    };

  } catch (error) {
    console.error('Smart Account MON transfer error:', error);
    const errorResult = handleTransactionError(error);
    return {
      success: false,
      error: errorResult.error,
    };
  }
}

/**
 * Check if Smart Account exists and is ready
 */
export function hasSmartAccount(): boolean {
  const { sa } = useAppStore.getState();
  return !!sa;
}
