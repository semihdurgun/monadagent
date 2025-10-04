// VM Hosting Service - Mock VM hosting data generation and purchase simulation

export interface VMCredentials {
  username: string;
  password: string;
  server: string;
  duration: string;
  purchaseDate: string;
  expiryDate: string;
}

export interface VMPurchaseResult {
  success: boolean;
  credentials?: VMCredentials;
  error?: string;
}

// Mock VM hosting data generation
export function generateMockVMCredentials(): VMCredentials {
  const servers = [
    'vm-us-east-01.monadblitz.com',
    'vm-eu-west-01.monadblitz.com', 
    'vm-asia-pacific-01.monadblitz.com',
    'vm-canada-01.monadblitz.com',
    'vm-germany-01.monadblitz.com'
  ];

  const adjectives = ['Secure', 'Fast', 'Private', 'Reliable', 'Premium', 'Ultra', 'Pro'];
  const nouns = ['Tiger', 'Eagle', 'Shark', 'Lion', 'Wolf', 'Phoenix', 'Dragon'];
  
  const username = `${adjectives[Math.floor(Math.random() * adjectives.length)]}_${nouns[Math.floor(Math.random() * nouns.length)]}_${Math.floor(Math.random() * 9999)}`;
  const password = generateSecurePassword();
  const server = servers[Math.floor(Math.random() * servers.length)];
  
  const now = new Date();
  const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  
  return {
    username,
    password,
    server,
    duration: '1 Ay',
    purchaseDate: now.toLocaleString('tr-TR'),
    expiryDate: expiry.toLocaleString('tr-TR')
  };
}

// Generate secure password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Simulate VM hosting purchase process with loading
export async function purchaseVM(): Promise<VMPurchaseResult> {
  try {
    // Simulate loading delay (5 seconds as requested)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Generate mock credentials
    const credentials = generateMockVMCredentials();
    
    console.log('🖥️ VM Hosting Purchase Completed:', credentials);
    
    return {
      success: true,
      credentials
    };
  } catch (error) {
    console.error('❌ VM Hosting Purchase Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    };
  }
}

// VM hosting static address
export const VM_MERCHANT_ADDRESS = '0x1fcD2c121AFc6FA94C3CcBC7Da4D7506Cb9312CB' as const;

// VM hosting service details
export const VM_SERVICE_INFO = {
  price: '1.0',
  currency: 'MON',
  duration: '1 Ay',
  features: [
    'Sınırsız bant genişliği',
    'SSD depolama',
    '24/7 destek',
    'Otomatik yedekleme',
    '5 farklı sunucu konumu'
  ]
};
