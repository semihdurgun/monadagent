/**
 * MetaMask ve diğer wallet hatalarını düzgün şekilde handle etmek için utility fonksiyonları
 */

export interface WalletError {
  code?: number;
  message: string;
  data?: any;
}

/**
 * MetaMask hata kodları
 */
export const METAMASK_ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  CHAIN_UNRECOGNIZED: 4902,
} as const;

/**
 * Hata mesajını analiz eder ve kullanıcı dostu mesaj döner
 */
export function parseWalletError(error: any): string {
  // Error object ise
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // MetaMask rejection patterns
    if (message.includes('user rejected') || 
        message.includes('user denied') ||
        message.includes('user cancelled') ||
        message.includes('rejected') ||
        message.includes('denied') ||
        message.includes('cancelled')) {
      return 'İşlem kullanıcı tarafından iptal edildi';
    }
    
    // Network errors
    if (message.includes('network') || message.includes('connection')) {
      return 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin';
    }
    
    // Gas errors
    if (message.includes('gas') || message.includes('insufficient')) {
      return 'Yetersiz gas veya bakiye. Lütfen bakiyenizi kontrol edin';
    }
    
    // Transaction errors
    if (message.includes('transaction') || message.includes('tx')) {
      return 'İşlem hatası. Lütfen tekrar deneyin';
    }
    
    return error.message;
  }
  
  // Object with code property (MetaMask error)
  if (error && typeof error === 'object') {
    const code = error.code;
    const message = error.message || '';
    
    switch (code) {
      case METAMASK_ERROR_CODES.USER_REJECTED:
        return 'İşlem kullanıcı tarafından iptal edildi';
      case METAMASK_ERROR_CODES.UNAUTHORIZED:
        return 'Yetkilendirme hatası. Lütfen cüzdanınızı bağlayın';
      case METAMASK_ERROR_CODES.UNSUPPORTED_METHOD:
        return 'Desteklenmeyen işlem türü';
      case METAMASK_ERROR_CODES.DISCONNECTED:
        return 'Cüzdan bağlantısı kesildi';
      case METAMASK_ERROR_CODES.CHAIN_DISCONNECTED:
        return 'Ağ bağlantısı kesildi';
      case METAMASK_ERROR_CODES.CHAIN_UNRECOGNIZED:
        return 'Tanınmayan ağ. Lütfen doğru ağı seçin';
      default:
        // Check message content for common patterns
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('user rejected') || 
            lowerMessage.includes('user denied') ||
            lowerMessage.includes('rejected') ||
            lowerMessage.includes('denied')) {
          return 'İşlem kullanıcı tarafından iptal edildi';
        }
        return message || 'Bilinmeyen hata';
    }
  }
  
  // String error
  if (typeof error === 'string') {
    const lowerError = error.toLowerCase();
    if (lowerError.includes('user rejected') || 
        lowerError.includes('user denied') ||
        lowerError.includes('rejected') ||
        lowerError.includes('denied')) {
      return 'İşlem kullanıcı tarafından iptal edildi';
    }
    return error;
  }
  
  return 'Bilinmeyen hata';
}

/**
 * Hata kullanıcı tarafından iptal edilmiş mi kontrol eder
 */
export function isUserRejectedError(error: any): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('user rejected') || 
           message.includes('user denied') ||
           message.includes('user cancelled') ||
           message.includes('rejected') ||
           message.includes('denied') ||
           message.includes('cancelled');
  }
  
  if (error && typeof error === 'object') {
    if (error.code === METAMASK_ERROR_CODES.USER_REJECTED) {
      return true;
    }
    
    const message = (error.message || '').toLowerCase();
    return message.includes('user rejected') || 
           message.includes('user denied') ||
           message.includes('rejected') ||
           message.includes('denied');
  }
  
  if (typeof error === 'string') {
    const lowerError = error.toLowerCase();
    return lowerError.includes('user rejected') || 
           lowerError.includes('user denied') ||
           lowerError.includes('rejected') ||
           lowerError.includes('denied');
  }
  
  return false;
}

/**
 * Hata chat'e gönderilmeli mi kontrol eder
 * Kullanıcı iptal ettiyse chat'e gönderme
 */
export function shouldShowErrorInChat(error: any): boolean {
  return !isUserRejectedError(error);
}

/**
 * Transaction sonucu için error handling
 */
export function handleTransactionError(error: any): {
  success: false;
  error: string;
  shouldShowInChat: boolean;
} {
  const errorMessage = parseWalletError(error);
  const shouldShow = shouldShowErrorInChat(error);
  
  return {
    success: false,
    error: errorMessage,
    shouldShowInChat: shouldShow
  };
}
