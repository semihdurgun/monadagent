import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseEther, 
  formatEther,
  getContract,
  encodeFunctionData,
  decodeEventLog,
  type Hash,
  type Address,
  type PublicClient,
  type WalletClient
} from 'viem';
import { monadTestnet } from '@/lib/chain';

// Contract ABI (Application Binary Interface)
const DELEGATION_MANAGER_ABI = [
  // Events
  {
    type: 'event',
    name: 'DelegationCreated',
    inputs: [
      { name: 'delegationId', type: 'bytes32', indexed: true },
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'expiresAt', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'DelegationUsed',
    inputs: [
      { name: 'delegationId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'recipient', type: 'address', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'DelegationRevoked',
    inputs: [
      { name: 'delegationId', type: 'bytes32', indexed: true },
      { name: 'from', type: 'address', indexed: true }
    ]
  },

  // Functions
  {
    type: 'function',
    name: 'createDelegation',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'smartAccount', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'durationSeconds', type: 'uint256' },
      { name: 'maxUses', type: 'uint256' },
      { name: 'allowedActions', type: 'string[]' }
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'useDelegation',
    inputs: [
      { name: 'delegationId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'recipient', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'revokeDelegation',
    inputs: [{ name: 'delegationId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getDelegationForUser',
    inputs: [
      { name: 'delegationId', type: 'bytes32' },
      { name: 'userAddress', type: 'address' }
    ],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'remainingAmount', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'maxUses', type: 'uint256' },
      { name: 'usedCount', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'smartAccount', type: 'address' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getUserDelegations',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getDelegation',
    inputs: [{ name: 'delegationId', type: 'bytes32' }],
    outputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'smartAccount', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'remainingAmount', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'maxUses', type: 'uint256' },
      { name: 'usedCount', type: 'uint256' },
      { name: 'isActive', type: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'totalDelegations',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getContractBalance',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;

// Contract address (deploy edildikten sonra buraya yazılacak)
const DELEGATION_MANAGER_ADDRESS = "0x5f031d3a4c7309509d82b3fe19094bf5b5d2a108" as Address; // Deploy edildikten sonra güncellenecek

export interface BlockchainDelegationConfig {
  to: string;                    // Arkadaş adresi
  smartAccount: string;          // Smart Account adresi
  amount: string;                // MON miktarı
  durationSeconds: number;       // Süre (saniye)
  maxUses: number;               // Maksimum kullanım
  allowedActions: string[];      // İzin verilen işlemler
}

export interface BlockchainDelegation {
  delegationId: string;
  from: string;
  to: string;
  smartAccount: string;
  amount: string;
  remainingAmount: string;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  durationSeconds: number;
  allowedActions: string[];
  createdAt: number;
}

/**
 * Public client oluştur (read-only operations)
 */
function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: monadTestnet,
    transport: http()
  });
}

/**
 * Wallet client oluştur (write operations)
 */
async function getWalletClient(): Promise<WalletClient> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not found');
  }

  return createWalletClient({
    chain: monadTestnet,
    transport: http(),
    account: (await window.ethereum.request({ method: 'eth_accounts' }))[0] as Address
  });
}

/**
 * Contract instance'ı al (read-only)
 */
function getDelegationContract() {
  const publicClient = getPublicClient();
  return getContract({
    address: DELEGATION_MANAGER_ADDRESS,
    abi: DELEGATION_MANAGER_ABI,
    client: publicClient
  });
}

/**
 * Blockchain'de delegation oluştur
 */
export async function createBlockchainDelegation(config: BlockchainDelegationConfig): Promise<{
  success: boolean;
  delegationId?: string;
  transactionHash?: string;
  error?: string;
}> {
  try {
    // MetaMask ile doğrudan transaction gönder
    if (!window.ethereum) {
      throw new Error('MetaMask bulunamadı');
    }

    // Amount'u wei'ye çevir
    const amountWei = parseEther(config.amount);
    
    // Debug: Amount conversion'ı logla
    console.log('Delegation creation debug:', {
      originalAmount: config.amount,
      amountWei: amountWei.toString(),
      formattedAmount: formatEther(amountWei)
    });

    // Contract function call data'sını encode et
    const callData = encodeFunctionData({
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'createDelegation',
      args: [
        config.to as Address,
        config.smartAccount as Address,
        amountWei,
        BigInt(config.durationSeconds),
        BigInt(config.maxUses),
        config.allowedActions
      ]
    });

    // MetaMask ile transaction gönder
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const from = accounts[0];

    const transactionParams = {
      from: from,
      to: DELEGATION_MANAGER_ADDRESS,
      value: amountWei.toString(16), // Contract MON transfer bekliyor
      data: callData
    };

    console.log('Sending transaction:', transactionParams);

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionParams]
    });

    console.log('Transaction sent:', txHash);

    // Transaction'ı bekle
    const publicClient = getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash as Hash,
      timeout: 60000 // 60 saniye timeout
    });
    
    console.log('Transaction confirmed:', receipt);

    // Event'ten delegation ID'yi al
    const delegationCreatedEvent = receipt.logs.find(
      log => {
        try {
          const parsed = decodeEventLog({
            abi: DELEGATION_MANAGER_ABI,
            data: log.data,
            topics: log.topics
          });
          return parsed.eventName === 'DelegationCreated';
        } catch {
          return false;
        }
      }
    );

    if (delegationCreatedEvent) {
      const parsed = decodeEventLog({
        abi: DELEGATION_MANAGER_ABI,
        data: delegationCreatedEvent.data,
        topics: delegationCreatedEvent.topics
      });
      
      if (parsed.eventName === 'DelegationCreated') {
        const delegationId = parsed.args.delegationId as string;
        
        return {
          success: true,
          delegationId: delegationId,
          transactionHash: txHash as string
        };
      }
    }

    return {
      success: false,
      error: 'DelegationCreated event not found'
    };

  } catch (error) {
    console.error('Blockchain delegation creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Blockchain'den delegation kullan
 */
export async function useBlockchainDelegation(
  delegationId: string,
  amount: string,
  recipient: string
): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    // MetaMask ile doğrudan transaction gönder
    if (!window.ethereum) {
      throw new Error('MetaMask bulunamadı');
    }

    // Amount'u wei'ye çevir
    const amountWei = parseEther(amount);

    // Debug: Use delegation parameters
    console.log('Use delegation debug:', {
      delegationId,
      amount,
      amountWei: amountWei.toString(),
      recipient,
      formattedAmount: formatEther(amountWei)
    });

    // Contract function call data'sını encode et
    const callData = encodeFunctionData({
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'useDelegation',
      args: [
        delegationId as Hash,
        amountWei,
        recipient as Address
      ]
    });

    // MetaMask ile transaction gönder
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const from = accounts[0];

    const transactionParams = {
      from: from,
      to: DELEGATION_MANAGER_ADDRESS,
      data: callData
    };

    console.log('Sending use delegation transaction:', transactionParams);

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionParams]
    });

    console.log('Use delegation transaction sent:', txHash);

    // Transaction'ı bekle
    const publicClient = getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash as Hash,
      timeout: 60000 // 60 saniye timeout
    });
    
    console.log('Use delegation transaction confirmed:', receipt);

    return {
      success: true,
      transactionHash: txHash as string
    };

  } catch (error) {
    console.error('Blockchain delegation usage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Blockchain'den delegation bilgilerini getir
 */
export async function getBlockchainDelegation(
  delegationId: string,
  userAddress: string
): Promise<BlockchainDelegation | null> {
  try {
    const publicClient = getPublicClient();

    // Delegation bilgilerini getir
    const result = await publicClient.readContract({
      address: DELEGATION_MANAGER_ADDRESS,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'getDelegationForUser',
      args: [delegationId as Hash, userAddress as Address]
    });

    const [amount, remainingAmount, expiresAt, maxUses, usedCount, isActive, smartAccount] = result;

    // Debug: Raw values'ları logla
    console.log('Raw delegation values:', {
      amount: amount.toString(),
      remainingAmount: remainingAmount.toString(),
      expiresAt: Number(expiresAt),
      maxUses: Number(maxUses),
      usedCount: Number(usedCount),
      isActive,
      smartAccount,
      formattedAmount: formatEther(amount),
      formattedRemainingAmount: formatEther(remainingAmount)
    });

    return {
      delegationId,
      from: '', // Arkadaş göremez
      to: userAddress,
      smartAccount,
      amount: formatEther(amount),
      remainingAmount: formatEther(remainingAmount),
      expiresAt: Number(expiresAt),
      maxUses: Number(maxUses),
      usedCount: Number(usedCount),
      isActive,
      durationSeconds: 3600, // Default 1 saat
      allowedActions: ['transfer', 'spend'], // Default actions
      createdAt: Math.floor(Date.now() / 1000) - 3600 // 1 saat önce oluşturulmuş varsayımı
    };

  } catch (error) {
    console.error('Get blockchain delegation error:', error);
    return null;
  }
}

/**
 * Blockchain'den kullanıcının delegation'larını getir
 */
export async function getUserBlockchainDelegations(userAddress: string): Promise<string[]> {
  try {
    const publicClient = getPublicClient();
    
    const result = await publicClient.readContract({
      address: DELEGATION_MANAGER_ADDRESS,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'getUserDelegations',
      args: [userAddress as Address]
    });

    return result.map(id => id as string);
  } catch (error) {
    console.error('Get user delegations error:', error);
    return [];
  }
}

/**
 * Delegation'ı iptal et
 */
export async function revokeBlockchainDelegation(delegationId: string): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    // MetaMask ile doğrudan transaction gönder
    if (!window.ethereum) {
      throw new Error('MetaMask bulunamadı');
    }

    // Contract function call data'sını encode et
    const callData = encodeFunctionData({
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'revokeDelegation',
      args: [delegationId as Hash]
    });

    // MetaMask ile transaction gönder
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const from = accounts[0];

    const transactionParams = {
      from: from,
      to: DELEGATION_MANAGER_ADDRESS,
      data: callData
    };

    console.log('Sending revoke delegation transaction:', transactionParams);

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionParams]
    });

    console.log('Revoke delegation transaction sent:', txHash);

    // Transaction'ı bekle
    const publicClient = getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash as Hash,
      timeout: 60000 // 60 saniye timeout
    });
    
    console.log('Revoke delegation transaction confirmed:', receipt);

    return {
      success: true,
      transactionHash: txHash as string
    };

  } catch (error) {
    console.error('Revoke blockchain delegation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Contract address'i güncelle
 */
export function updateContractAddress(newAddress: string) {
  // Bu fonksiyon deploy edildikten sonra contract address'i güncellemek için kullanılır
  console.log('Contract address updated to:', newAddress);
  // Gerçek uygulamada bu değer environment variable veya config dosyasından alınır
}

/**
 * Smart Account ile delegation oluştur (simplified)
 */
export async function createSmartAccountDelegation(config: BlockchainDelegationConfig): Promise<{
  success: boolean;
  delegationId?: string;
  transactionHash?: string;
  error?: string;
}> {
  try {
    // MetaMask ile doğrudan transaction gönder
    if (!window.ethereum) {
      throw new Error('MetaMask bulunamadı');
    }

    // Amount'u wei'ye çevir
    const amountWei = parseEther(config.amount);
    
    // Debug: Amount conversion'ı logla
    console.log('Smart Account Delegation creation debug:', {
      originalAmount: config.amount,
      amountWei: amountWei.toString(),
      formattedAmount: formatEther(amountWei)
    });

    // Contract function call data'sını encode et
    const callData = encodeFunctionData({
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'createDelegation',
      args: [
        config.to as Address,
        config.to as Address, // Smart Account adresi olarak aynı adresi kullan
        amountWei,
        BigInt(config.durationSeconds),
        BigInt(config.maxUses),
        config.allowedActions
      ]
    });

    // MetaMask ile transaction gönder
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const from = accounts[0];

    const transactionParams = {
      from: from,
      to: DELEGATION_MANAGER_ADDRESS,
      value: amountWei.toString(16), // Contract MON transfer bekliyor
      data: callData
    };

    console.log('Sending transaction:', transactionParams);

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionParams]
    });

    console.log('Delegation transaction sent:', txHash);

    // Transaction'ı bekle
    const publicClient = getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash as Hash,
      timeout: 60000 // 60 saniye timeout
    });
    
    console.log('Delegation transaction confirmed:', receipt);

    // Debug: Receipt logs'ları kontrol et
    console.log('Receipt logs:', receipt.logs);
    console.log('Receipt logs length:', receipt.logs.length);

    // Event'ten delegation ID'yi al
    const delegationCreatedEvent = receipt.logs.find(
      (log, index) => {
        console.log(`Checking log ${index}:`, {
          address: log.address,
          topics: log.topics,
          topicsLength: log.topics.length,
          data: log.data
        });
        
        try {
          const parsed = decodeEventLog({
            abi: DELEGATION_MANAGER_ABI,
            data: log.data,
            topics: log.topics
          });
          console.log('Parsed event:', parsed);
          return parsed.eventName === 'DelegationCreated';
        } catch (error) {
          console.log('Event parsing error:', error);
          return false;
        }
      }
    );

    console.log('Found delegation event:', delegationCreatedEvent);

    if (delegationCreatedEvent) {
      const parsed = decodeEventLog({
        abi: DELEGATION_MANAGER_ABI,
        data: delegationCreatedEvent.data,
        topics: delegationCreatedEvent.topics
      });
      
      console.log('Final parsed event:', parsed);
      
      if (parsed.eventName === 'DelegationCreated') {
        const delegationId = parsed.args.delegationId as string;
        console.log('Extracted delegation ID:', delegationId);
        
        return {
          success: true,
          delegationId: delegationId,
          transactionHash: txHash as string
        };
      }
    }

    return {
      success: false,
      error: 'DelegationCreated event not found'
    };

  } catch (error) {
    console.error('Delegation creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Contract'ın deploy edilip edilmediğini kontrol et
 */
export async function isContractDeployed(): Promise<boolean> {
  try {
    if (DELEGATION_MANAGER_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return false;
    }

    const publicClient = getPublicClient();
    const code = await publicClient.getBytecode({
      address: DELEGATION_MANAGER_ADDRESS
    });
    
    return code !== undefined && code !== "0x";
  } catch (error) {
    console.error('Check contract deployment error:', error);
    return false;
  }
}
