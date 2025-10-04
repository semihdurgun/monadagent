import { parseUnits } from 'viem';
import { useAppStore } from './store';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface VirtualCardConfig {
  merchant: string; // "Trendyol", "Amazon", etc.
  merchantAddress: `0x${string}`; // Merchant's address
  amount: string; // Amount in MON
  duration: number; // Duration in hours
  maxUses: number; // Max number of uses (usually 1)
}

export interface VirtualCard {
  id: string;
  merchant: string;
  merchantAddress: `0x${string}`;
  amount: string;
  remainingAmount: string;
  duration: number;
  maxUses: number;
  usedCount: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'used_up' | 'revoked';
  delegationHash?: string;
}

/**
 * Create a virtual card delegation for secure shopping
 */
export async function createVirtualCard(config: VirtualCardConfig): Promise<{
  success: boolean;
  virtualCard?: VirtualCard;
  error?: string;
}> {
  try {
    const { sa } = useAppStore.getState();
    
    if (!sa) {
      throw new Error('Smart Account bulunamadı. Lütfen önce Smart Account oluşturun.');
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.duration);

    // Create virtual card object
    const virtualCard: VirtualCard = {
      id: `vc_${Date.now()}`,
      merchant: config.merchant,
      merchantAddress: config.merchantAddress,
      amount: config.amount,
      remainingAmount: config.amount,
      duration: config.duration,
      maxUses: config.maxUses,
      usedCount: 0,
      createdAt: new Date(),
      expiresAt,
      status: 'active',
    };

    // In a real implementation, we would create a delegation here
    // For demo purposes, we'll simulate it
    console.log('🎴 Creating Virtual Card:', virtualCard);
    
    // Simulate delegation creation
    const delegationHash = `0x${Math.random().toString(16).substr(2, 40)}`;
    virtualCard.delegationHash = delegationHash;

    // Store virtual card in app state
    const { addVirtualCard } = useAppStore.getState();
    addVirtualCard(virtualCard);

    return {
      success: true,
      virtualCard,
    };

  } catch (error) {
    console.error('Virtual card creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Simulate merchant using the virtual card
 */
export async function useVirtualCard(cardId: string, useAmount: string): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    const { virtualCards, updateVirtualCard } = useAppStore.getState();
    const card = virtualCards.find(c => c.id === cardId);
    
    if (!card) {
      throw new Error('Virtual card bulunamadı');
    }

    if (card.status !== 'active') {
      throw new Error('Virtual card aktif değil');
    }

    if (new Date() > card.expiresAt) {
      throw new Error('Virtual card süresi dolmuş');
    }

    if (card.usedCount >= card.maxUses) {
      throw new Error('Virtual card kullanım limiti dolmuş');
    }

    // Check if remaining amount is sufficient
    const remainingAmount = parseUnits(card.remainingAmount, 18);
    const useAmountWei = parseUnits(useAmount, 18);
    
    if (useAmountWei > remainingAmount) {
      throw new Error('Yetersiz bakiye');
    }

    // Simulate transaction
    const transactionHash = `0x${Math.random().toString(16).substr(2, 40)}`;
    
    // Update card status
    const newUsedCount = card.usedCount + 1;
    const newRemainingAmount = (remainingAmount - useAmountWei).toString();
    
    updateVirtualCard(cardId, {
      usedCount: newUsedCount,
      remainingAmount: newRemainingAmount,
      status: newUsedCount >= card.maxUses ? 'used_up' : 'active'
    });

    console.log('💳 Virtual Card Used:', {
      cardId,
      useAmount,
      transactionHash,
      remainingUses: card.maxUses - newUsedCount
    });

    return {
      success: true,
      transactionHash: transactionHash as `0x${string}`,
    };

  } catch (error) {
    console.error('Virtual card usage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Revoke virtual card
 */
export function revokeVirtualCard(cardId: string): boolean {
  try {
    const { updateVirtualCard } = useAppStore.getState();
    updateVirtualCard(cardId, { status: 'revoked' });
    console.log('🚫 Virtual Card Revoked:', cardId);
    return true;
  } catch (error) {
    console.error('Virtual card revocation error:', error);
    return false;
  }
}

/**
 * Get merchant address by name (demo data)
 */
export function getMerchantAddress(merchantName: string): `0x${string}` {
  const merchants: Record<string, `0x${string}`> = {
    'kizzy': '0xK1zzy1234567890abcdef1234567890abcdef12',
    'magmadao': '0xMagmaDAO1234567890abcdef1234567890ab',
    'trendyol': '0x742d35Cc6634C0532925a3b8D1C0d8c3c3c3c3c3c',
    'amazon': '0x8ba1f109551bD432803012645Hac136c0c3c3c3c3',
    'nike': '0x9ca1f109551bD432803012645Hac136c0c3c3c3c4',
    'adidas': '0x7ca1f109551bD432803012645Hac136c0c3c3c3c5',
  };

  const normalizedName = merchantName.toLowerCase();
  return merchants[normalizedName] || merchants['kizzy'];
}
