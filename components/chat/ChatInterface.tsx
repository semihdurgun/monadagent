'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Sparkles, Loader2, Wallet, Trash2, Copy, Clock, Coins, UserCheck, Shield, Globe } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AICommandProcessor, type AICommand } from '@/lib/aiCommands';
import { WalletConnection } from '@/components/wallet/WalletConnection';
import { useWallet } from '@/lib/useWallet';
import { sendNativeMON, parseTransferMessage, isValidAddress } from '@/lib/nativeTransfer';
import { createBlockchainDelegation } from '@/lib/blockchainDelegation';
import { purchaseVM, VM_MERCHANT_ADDRESS, VM_SERVICE_INFO } from '@/lib/vpnService';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  command?: AICommand;
  actions?: string | null;
  address?: string | null;
  amount?: string | null;
  duration?: string | null;
  recipient?: string | null;
  vmAddress?: string | null;
}

// Load messages from localStorage or use default
const loadMessagesFromStorage = (): Message[] => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('monadblitz-chat-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }
  
  return [
    {
      id: '1',
      content: 'Merhaba! Ben Monad AI Agent\'ıyım. Size nasıl yardımcı olabilirim? İşlemlerinizde veya Monad ağında rehberlik edebilirim.',
      role: 'assistant',
      timestamp: new Date(),
    },
  ];
};

const initialMessages: Message[] = loadMessagesFromStorage();

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const commandProcessor = useRef(new AICommandProcessor());
  const { isConnected, onMonad, sa } = useWallet();
  const [isTransferring, setIsTransferring] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save messages to localStorage whenever messages change
  const saveMessagesToStorage = (newMessages: Message[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('monadblitz-chat-history', JSON.stringify(newMessages));
        
        // Log to console as JSON array
        const logData = newMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp.toISOString(),
          command: msg.command,
          actions: msg.actions,
          address: msg.address
        }));
        
        console.log('=== MONADBLITZ CHAT HISTORY ===');
        console.log('Total Messages:', newMessages.length);
        console.log('JSON Array:', JSON.stringify(logData, null, 2));
        
        // Log each message separately for easier debugging
        newMessages.forEach((msg, index) => {
          console.log(`Message ${index + 1}:`, {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            actions: msg.actions,
            address: msg.address,
            timestamp: msg.timestamp.toISOString()
          });
        });
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }
  };

  // Clear chat history
  const clearChatHistory = () => {
    const defaultMessage: Message = {
      id: '1',
      content: 'Merhaba! Ben Monad AI Agent\'ıyım. Size nasıl yardımcı olabilirim? İşlemlerinizde veya Monad ağında rehberlik edebilirim.',
      role: 'assistant',
      timestamp: new Date(),
    };
    
    setMessages([defaultMessage]);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('monadblitz-chat-history', JSON.stringify([defaultMessage]));
      console.log('🗑️ Chat history cleared');
    }
  };

  // Debug function to check localStorage
  const debugLocalStorage = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('monadblitz-chat-history');
      console.log('🔍 localStorage Debug:');
      console.log('Raw stored data:', stored);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('Parsed data:', parsed);
          console.log('Number of messages:', parsed.length);
        } catch (error) {
          console.error('Error parsing stored data:', error);
        }
      }
    }
  };

  // Expose debug function to window for easy access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugChatHistory = debugLocalStorage;
      (window as any).clearChatHistory = clearChatHistory;
      console.log('🔧 Debug functions available:');
      console.log('- window.debugChatHistory() - Check localStorage');
      console.log('- window.clearChatHistory() - Clear chat history');
    }
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  const scrollToBottomImmediate = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  useEffect(() => {
    // Use immediate scroll for better UX
    const timeoutId = setTimeout(() => {
      scrollToBottomImmediate();
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Save to localStorage whenever messages change
  useEffect(() => {
    saveMessagesToStorage(messages);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Check if wallet is connected first
    if (!isConnected) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: '❌ Blockchain işlemleri için MetaMask cüzdanınızı bağlamanız gerekiyor.',
        role: 'assistant',
        timestamp: new Date(),
        actions: null,
        address: null,
        amount: null,
        duration: null,
        recipient: null,
        vmAddress: null
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setInputValue('');
      return;
    }

    // Check if wallet is connected for blockchain commands
    const command = await commandProcessor.current.processCommand(inputValue);
    const isBlockchainCommand = ['subscription', 'payment_card', 'shared_pot', 'digital_will', 'scheduled_payment', 'virtual_card'].includes(command.type);
    
    if (isBlockchainCommand && (!isConnected || !onMonad)) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: '❌ Blockchain işlemleri için MetaMask cüzdanınızı bağlamanız ve Monad Testnet ağında olmanız gerekiyor.',
        role: 'assistant',
        timestamp: new Date(),
        actions: null,
        address: null,
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
      actions: null,
      address: null,
    };

    // Log user message to console
    console.log('👤 User Message:', userMessage);
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Focus back to input after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    try {
      // First try to process as a blockchain command
      const command = await commandProcessor.current.processCommand(inputValue);
      
      // Log blockchain command to console
      console.log('⚡ Blockchain Command:', command);
      
      // If it's a blockchain command, use our AI processor
      if (command.type === 'help' || command.type === 'subscription' || command.type === 'payment_card' || command.type === 'shared_pot' || command.type === 'digital_will' || command.type === 'scheduled_payment' || command.type === 'virtual_card') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: command.response,
          role: 'assistant',
          timestamp: new Date(),
          command,
          actions: null,
          address: null,
        };
        
        // Log blockchain response to console
        console.log('🔧 Blockchain Response:', assistantMessage);
        
        setMessages(prev => [...prev, assistantMessage]);
        } else {
          // For general questions, use Gemini AI
          // Get last 3 messages for context
          const recentMessages = messages.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.content,
            actions: msg.actions,
            address: msg.address,
            amount: msg.amount,
            duration: msg.duration,
            recipient: msg.recipient,
              vmAddress: msg.vmAddress
          }));
          
          console.log('📚 Recent Context (Last 3 messages):', recentMessages);
          
          const geminiResponse = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: inputValue,
              context: recentMessages
            }),
          });

          if (geminiResponse.ok) {
            const data = await geminiResponse.json();
            
            // Log Gemini response to console
            console.log('🤖 Gemini API Response:', data);
            console.log('📝 Raw Gemini Data:', JSON.stringify(data, null, 2));
            console.log('🔍 VM Purchase Check:', {
              actions: data.actions,
              vmAddress: data.vmAddress,
              hasActions: !!data.actions,
              hasVmAddress: !!data.vmAddress,
              isVMPurchase: data.actions === 'vm_purchase'
            });
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              content: data.message,
              role: 'assistant',
              timestamp: new Date(),
              actions: data.actions || null,
              address: data.address || null,
              amount: data.amount || null,
              duration: data.duration || null,
              recipient: data.recipient || null,
              vmAddress: data.vmAddress || null,
            };
            setMessages(prev => [...prev, assistantMessage]);
          } else {
            throw new Error('Gemini API yanıt vermedi');
          }
        }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ Bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        role: 'assistant',
        timestamp: new Date(),
        actions: null,
        address: null,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Focus back to input after response
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTransfer = async (message: Message) => {
    if (!message.actions || message.actions !== 'send_mon') return;
    
    setIsTransferring(true);
    
    try {
      // First check if message already has address
      let transferParams;
      
      if (message.address) {
        // Use address from message and parse amount from content
        const amountFromContent = parseTransferMessage(message.content).amount;
        if (!amountFromContent) {
          throw new Error('Transfer miktarı bulunamadı');
        }
        transferParams = {
          address: message.address as `0x${string}`,
          amount: amountFromContent
        };
      } else {
        // Fallback to parsing from content
        transferParams = parseTransferMessage(inputValue || message.content);
      }
      
      console.log('🔍 Transfer Params:', transferParams);
      
      if (!transferParams.amount) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: '❌ Transfer miktarı belirtilmedi. Örnek: "0.1 MON gönder 0x..."',
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      if (!transferParams.address) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: '❌ Alıcı adresi belirtilmedi. Örnek: "0.1 MON gönder 0x..."',
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      if (!isValidAddress(transferParams.address)) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: '❌ Geçersiz Ethereum adresi. Lütfen geçerli bir adres girin.',
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Execute transfer
      console.log('💰 Executing MON Transfer:', transferParams);
      
      const result = await sendNativeMON({
        to: transferParams.address,
        amount: transferParams.amount,
      });

      console.log('💰 Transfer Result:', result);

      if (result.success) {
        const successMessage: Message = {
          id: Date.now().toString(),
          content: `✅ ${transferParams.amount} MON başarıyla ${transferParams.address.slice(0, 10)}... adresine gönderildi!\n\n📋 İşlem Hash: ${result.txHash}`,
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
        };
        console.log('✅ Transfer Success Message:', successMessage);
        setMessages(prev => [...prev, successMessage]);
      } else {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: `❌ Transfer başarısız: ${result.error}`,
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
        };
        console.log('❌ Transfer Error Message:', errorMessage);
        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `❌ Transfer hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDelegation = async (message: Message) => {
    if (!message.actions || message.actions !== 'delegation') return;
    
    setIsTransferring(true);
    
    try {
      // Check if we have all required delegation parameters
      if (!message.amount || !message.duration || !message.recipient) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: '❌ Delegasyon için tüm bilgiler gerekli: MON miktarı, süre ve arkadaş adresi.',
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
          amount: null,
          duration: null,
          recipient: null,
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      if (!isValidAddress(message.recipient)) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: '❌ Geçersiz arkadaş adresi. Lütfen geçerli bir Ethereum adresi girin.',
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
          amount: null,
          duration: null,
          recipient: null,
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      if (!sa) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: '❌ Delegasyon oluşturmak için Smart Account gerekli. Lütfen önce Smart Account oluşturun.',
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
          amount: null,
          duration: null,
          recipient: null,
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Execute delegation creation
      console.log('🔗 Creating Delegation:', {
        amount: message.amount,
        duration: message.duration,
        recipient: message.recipient
      });
      
      const result = await createBlockchainDelegation({
        to: message.recipient as `0x${string}`,
        amount: message.amount,
        durationSeconds: parseInt(message.duration),
        maxUses: 1,
        allowedActions: ['transfer', 'spend', 'withdraw'],
        smartAccount: sa as `0x${string}`
      });

      console.log('🔗 Delegation Result:', result);

      if (result.success) {
        const successMessage: Message = {
          id: Date.now().toString(),
          content: `✅ ${message.amount} MON delegasyonu başarıyla oluşturuldu!`,
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
          amount: null,
          duration: null,
          recipient: null,
        };
        console.log('✅ Delegation Success Message:', successMessage);
        setMessages(prev => [...prev, successMessage]);

        // Add detailed delegation info as a separate message
        const delegationInfoMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `📋 **Delegasyon Detayları**\n\n🔗 **Delegation ID:** \`${result.delegationId}\`\n⏱️ **Süre:** ${Math.floor(parseInt(message.duration) / 3600)} saat\n💸 **Miktar:** ${message.amount} MON\n🎯 **Arkadaş Adresi:** \`${message.recipient}\`\n⏰ **Oluşturulma:** ${new Date().toLocaleString('tr-TR')}\n\n*Bu delegasyon ID'sini arkadaşınızla paylaşarak kullanım yetkisi verebilirsiniz.*`,
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
          amount: null,
          duration: null,
          recipient: null,
        };
        setMessages(prev => [...prev, delegationInfoMessage]);
      } else {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: `❌ Delegasyon başarısız: ${result.error}`,
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
          amount: null,
          duration: null,
          recipient: null,
        };
        console.log('❌ Delegation Error Message:', errorMessage);
        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `❌ Delegasyon hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        role: 'assistant',
        timestamp: new Date(),
        actions: null,
        address: null,
        amount: null,
        duration: null,
        recipient: null,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleVMPurchase = async (message: Message) => {
    if (!message.actions || message.actions !== 'vm_purchase') return;
    
    setIsTransferring(true);
    
    try {
      // First send MON to VM hosting merchant address
      console.log('🖥️ Starting VM Hosting Purchase:', {
        address: VM_MERCHANT_ADDRESS,
        amount: VM_SERVICE_INFO.price
      });
      
      const transferResult = await sendNativeMON({
        to: VM_MERCHANT_ADDRESS as `0x${string}`,
        amount: VM_SERVICE_INFO.price,
      });

      console.log('🖥️ VM Transfer Result:', transferResult);

      if (transferResult.success) {
        // Show transaction success message
        const transferMessage: Message = {
          id: Date.now().toString(),
          content: `✅ ${VM_SERVICE_INFO.price} MON VM hosting merchant'a başarıyla gönderildi!\n\n📋 Transaction Hash: ${transferResult.txHash}\n🖥️ VM hosting bilgileri hazırlanıyor...`,
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
          amount: null,
          duration: null,
          recipient: null,
          vmAddress: null,
        };
        setMessages(prev => [...prev, transferMessage]);

        // Start VM hosting purchase process with loading
        const vmResult = await purchaseVM();

        if (vmResult.success && vmResult.credentials) {
          const successMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `🎉 VM hosting satın alma işlemi tamamlandı!`,
            role: 'assistant',
            timestamp: new Date(),
            actions: null,
            address: null,
            amount: null,
            duration: null,
            recipient: null,
            vmAddress: null,
          };
          setMessages(prev => [...prev, successMessage]);

          // Add VM credentials as a separate message
          const credentialsMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: `🖥️ **VM Hosting Bilgileri**\n\n👤 **Username:** \`${vmResult.credentials.username}\`\n🔑 **Password:** \`${vmResult.credentials.password}\`\n🌐 **Server:** \`${vmResult.credentials.server}\`\n⏱️ **Süre:** ${vmResult.credentials.duration}\n📅 **Başlangıç:** ${vmResult.credentials.purchaseDate}\n⏰ **Bitiş:** ${vmResult.credentials.expiryDate}\n\n*Bu bilgileri VM hosting servisinizde kullanabilirsiniz.*`,
            role: 'assistant',
            timestamp: new Date(),
            actions: null,
            address: null,
            amount: null,
            duration: null,
            recipient: null,
            vmAddress: null,
          };
          setMessages(prev => [...prev, credentialsMessage]);
        } else {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `❌ VM hosting satın alma başarısız: ${vmResult.error}`,
            role: 'assistant',
            timestamp: new Date(),
            actions: null,
            address: null,
            amount: null,
            duration: null,
            recipient: null,
            vmAddress: null,
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: `❌ VM hosting ödeme başarısız: ${transferResult.error}`,
          role: 'assistant',
          timestamp: new Date(),
          actions: null,
          address: null,
          amount: null,
          duration: null,
          recipient: null,
          vmAddress: null,
        };
        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `❌ VM hosting satın alma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        role: 'assistant',
        timestamp: new Date(),
        actions: null,
        address: null,
        amount: null,
        duration: null,
        recipient: null,
        vmAddress: null,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/60 bg-background/40 backdrop-blur">
        {/* <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-5 h-5 text-primary" />
        </div> */}
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Monad AI Agent</h3>
          <p className="text-xs text-muted-foreground">
            {isConnected && onMonad ? 'Cüzdan Bağlı • Monad Testnet' : 'Cüzdan Bağlantısı Gerekli'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={clearChatHistory}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            title="Chat geçmişini temizle"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          {!isConnected && (
            <Wallet className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Wallet Connection Status */}
      {!isConnected && (
        <div className="p-4 border-b border-border/60 bg-yellow-50 dark:bg-yellow-950/20">
          <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
            <Wallet className="w-4 h-4" />
            <span>Blockchain işlemleri için MetaMask cüzdanınızı bağlayın</span>
          </div>
        </div>
      )}
      

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0 overflow-hidden">
                <Image
                  src="/monagent.jpeg"
                  alt="MonAgent AI"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            )}
            
            <Card
              className={cn(
                'max-w-[80%] p-3',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background/60 border-border/60'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {/* Special rendering for VM credentials messages */}
              {message.content.includes('**VM Hosting Bilgileri**') && (
                (() => {
                  console.log('🔍 VM Message Content:', message.content);
                  console.log('🔍 Full message content:', JSON.stringify(message.content, null, 2));
                  
                  // Test different regex patterns
                  const usernamePattern1 = /Username:\s*`([^`]+)`/;
                  const usernamePattern2 = /Username:\s*\*\*([^*]+)\*\*/;
                  const usernamePattern3 = /Username:\s*([^\n]+)/;
                  
                  console.log('🔍 Username Match Pattern 1:', message.content.match(usernamePattern1));
                  console.log('🔍 Username Match Pattern 2:', message.content.match(usernamePattern2));
                  console.log('🔍 Username Match Pattern 3:', message.content.match(usernamePattern3));
                  
                  const passwordPattern1 = /Password:\s*`([^`]+)`/;
                  const passwordPattern2 = /Password:\s*\*\*([^*]+)\*\*/;
                  const passwordPattern3 = /Password:\s*([^\n]+)/;
                  
                  console.log('🔍 Password Match Pattern 1:', message.content.match(passwordPattern1));
                  console.log('🔍 Password Match Pattern 2:', message.content.match(passwordPattern2));
                  console.log('🔍 Password Match Pattern 3:', message.content.match(passwordPattern3));
                  
                  const serverPattern1 = /Server:\s*`([^`]+)`/;
                  const serverPattern2 = /Server:\s*\*\*([^*]+)\*\*/;
                  const serverPattern3 = /Server:\s*([^\n]+)/;
                  
                  console.log('🔍 Server Match Pattern 1:', message.content.match(serverPattern1));
                  console.log('🔍 Server Match Pattern 2:', message.content.match(serverPattern2));
                  console.log('🔍 Server Match Pattern 3:', message.content.match(serverPattern3));
                  
                  return null;
                })()
              )}
              {message.content.includes('**VM Hosting Bilgileri**') && (
                <Card className="mt-3 p-4 bg-purple-50/50 border-purple-200/50 dark:bg-purple-950/20 dark:border-purple-800/30">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span className="font-semibold text-purple-700 dark:text-purple-300">VM Hosting Erişim Bilgileri</span>
                    </div>
                    
                    {message.content.includes('Username:') && (
                      <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded border">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="text-xs font-medium">Username:</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {(() => {
                              const match = message.content.match(/Username:\s*`([^`]+)`/) || 
                                           message.content.match(/Username:\s*\*\*([^*]+)\*\*/) ||
                                           message.content.match(/Username:\s*([^\n]+)/);
                              return match?.[1]?.trim() || 'N/A';
                            })()}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              const match = message.content.match(/Username:\s*`([^`]+)`/) || 
                                           message.content.match(/Username:\s*\*\*([^*]+)\*\*/) ||
                                           message.content.match(/Username:\s*([^\n]+)/);
                              const username = match?.[1]?.trim();
                              if (username) {
                                navigator.clipboard.writeText(username);
                              }
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {message.content.includes('Password:') && (
                      <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded border">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-gray-500" />
                          <span className="text-xs font-medium">Password:</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {(() => {
                              const match = message.content.match(/Password:\s*`([^`]+)`/) || 
                                           message.content.match(/Password:\s*\*\*([^*]+)\*\*/) ||
                                           message.content.match(/Password:\s*([^\n]+)/);
                              return match?.[1]?.trim() || 'N/A';
                            })()}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              const match = message.content.match(/Password:\s*`([^`]+)`/) || 
                                           message.content.match(/Password:\s*\*\*([^*]+)\*\*/) ||
                                           message.content.match(/Password:\s*([^\n]+)/);
                              const password = match?.[1]?.trim();
                              if (password) {
                                navigator.clipboard.writeText(password);
                              }
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {message.content.includes('Server:') && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-blue-500" />
                          <span className="truncate">
                            {(() => {
                              const match = message.content.match(/Server:\s*`([^`]+)`/) || 
                                           message.content.match(/Server:\s*\*\*([^*]+)\*\*/) ||
                                           message.content.match(/Server:\s*([^\n]+)/);
                              return match?.[1]?.trim() || 'N/A';
                            })()}
                          </span>
                        </div>
                      )}
                      
                      {message.content.includes('Süre:') && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span>{message.content.match(/Süre:\s*([^\n]+)/)?.[1] || 'N/A'}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground italic border-t pt-2">
                      Bu bilgileri VM hosting servisinizde kullanabilirsiniz.
                    </div>
                  </div>
                </Card>
              )}

              {/* Special rendering for delegation info messages */}
              {message.content.includes('**Delegasyon Detayları**') && (
                <Card className="mt-3 p-4 bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-800/30">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-700 dark:text-blue-300">Delegasyon Bilgileri</span>
                    </div>
                    
                    {message.content.includes('Delegation ID:') && (
                      <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded border">
                        <div className="flex items-center gap-2">
                          <Copy className="w-3 h-3 text-gray-500" />
                          <span className="text-xs font-medium">Delegation ID:</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {message.content.match(/`([^`]+)`/)?.[1] || 'N/A'}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              const delegationId = message.content.match(/`([^`]+)`/)?.[1];
                              if (delegationId) {
                                navigator.clipboard.writeText(delegationId);
                              }
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {message.content.includes('Süre:') && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span>{message.content.match(/Süre:\s*([^\n]+)/)?.[1] || 'N/A'}</span>
                        </div>
                      )}
                      
                      {message.content.includes('Miktar:') && (
                        <div className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-green-500" />
                          <span>{message.content.match(/Miktar:\s*([^\n]+)/)?.[1] || 'N/A'}</span>
                        </div>
                      )}
                      
                      {message.content.includes('Arkadaş Adresi:') && (
                        <div className="flex items-center gap-1 col-span-2">
                          <UserCheck className="w-3 h-3 text-purple-500" />
                          <span className="truncate">{message.content.match(/Arkadaş Adresi:\s*`([^`]+)`/)?.[1] || 'N/A'}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground italic border-t pt-2">
                      Bu delegasyon ID'sini arkadaşınızla paylaşarak kullanım yetkisi verebilirsiniz.
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Action buttons for assistant messages */}
              {message.role === 'assistant' && message.actions === 'send_mon' && message.address && (
                <div className="mt-3">
                  <Button
                    onClick={() => handleTransfer(message)}
                    disabled={isTransferring}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-2" />
                        MON Gönder
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Delegation button for assistant messages */}
              {message.role === 'assistant' && message.actions === 'delegation' && message.amount && message.duration && message.recipient && (
                <div className="mt-3">
                  <Button
                    onClick={() => handleDelegation(message)}
                    disabled={isTransferring}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Delegasyon Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-2" />
                        Delegasyon Oluştur
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* VM hosting purchase button for assistant messages */}
              {(() => {
                const shouldShowVMButton = message.role === 'assistant' && message.actions === 'vm_purchase' && message.vmAddress;
                console.log('🔍 VM Button Check:', {
                  messageRole: message.role,
                  messageActions: message.actions,
                  messageVmAddress: message.vmAddress,
                  shouldShowVMButton
                });
                return shouldShowVMButton;
              })() && (
                <div className="mt-3">
                  <Button
                    onClick={() => handleVMPurchase(message)}
                    disabled={isTransferring}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        VM Hosting Satın Alınıyor...
                      </>
                    ) : (
                      <>
                        <Shield className="w-3 h-3 mr-2" />
                        VM Hosting Satın Al (1 MON)
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              <p className={cn(
                'text-xs mt-1',
                message.role === 'user' 
                  ? 'text-primary-foreground/70' 
                  : 'text-muted-foreground'
              )}>
                {message.timestamp.toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </Card>

            {message.role === 'user' && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted border border-border flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0 overflow-hidden">
              <Image
                src="/monagent.jpeg"
                alt="MonAgent AI"
                width={32}
                height={32}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <Card className="bg-background/60 border-border/60 p-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">İşlem işleniyor...</span>
              </div>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/60 bg-background/40 backdrop-blur">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Mesajınızı yazın..." : "Blockchain işlemleri için MetaMask cüzdanınızı bağlayın"}
            className="flex-1"
            disabled={isLoading || !isConnected}
            autoFocus={isConnected}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !isConnected}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {isConnected ? (
            "Enter ile gönder • Shift+Enter ile yeni satır"
          ) : (
            "Cüzdan bağlantısı gerekli • MetaMask'ı bağlayın"
          )}
        </p>
      </div>
    </div>
  );
}
