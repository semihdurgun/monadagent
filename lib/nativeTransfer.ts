import { parseUnits } from 'viem';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface TransferParams {
  to: `0x${string}`;
  amount: string; // in MON (e.g., "0.1")
}

/**
 * Send native MON tokens from EOA (External Owned Account)
 * Works without Smart Account
 */
export async function sendNativeMON(params: TransferParams): Promise<{
  success: boolean;
  txHash?: `0x${string}`;
  error?: string;
}> {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask bulunamadı');
    }

    // Parse amount to wei (MON has 18 decimals)
    const amountWei = parseUnits(params.amount, 18);

    // Get current account
    const [from] = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    // Send native transfer from EOA
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: from, // Send from connected EOA
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
    console.error('MON transfer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Extract amount and address from message
 */
export function parseTransferMessage(message: string): {
  amount?: string;
  address?: `0x${string}`;
} {
  // Pattern: "0.1 MON gönder 0x..."
  const withAddressPattern = /(\d+(?:\.\d+)?)\s*MON\s+gönder\s+(0x[a-fA-F0-9]{40})/i;
  const withAddressMatch = message.match(withAddressPattern);
  
  if (withAddressMatch) {
    return {
      amount: withAddressMatch[1],
      address: withAddressMatch[2] as `0x${string}`,
    };
  }

  // Pattern: "0.1 MON gönder" (without address)
  const amountOnlyPattern = /(\d+(?:\.\d+)?)\s*MON\s+gönder/i;
  const amountOnlyMatch = message.match(amountOnlyPattern);
  
  if (amountOnlyMatch) {
    return {
      amount: amountOnlyMatch[1],
    };
  }

  return {};
}
