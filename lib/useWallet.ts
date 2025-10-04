'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from './store';
import { getNativeBalance } from '@/lib/native';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    eoa,
    onMonad,
    sa,
    saMon,
    setEOA,
    setSA,
    setOnMonad,
    setChainId,
    setSAMon,
    setHasFauceted,
  } = useAppStore();

  // Check if wallet is connected
  const isConnected = !!eoa && !!onMonad;

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask bulunamadı. Lütfen MetaMask eklentisini yükleyin.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('Hesap bulunamadı');
      }

      const account = accounts[0] as `0x${string}`;
      setEOA(account);

      // Check network
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      const chainIdNumber = parseInt(chainId, 16);
      setChainId(chainIdNumber);

      if (chainIdNumber !== 10143) {
        setError('Lütfen Monad Testnet ağına geçin (Chain ID: 10143)');
        setIsConnecting(false);
        return;
      }

      setOnMonad(true);

      // Create Smart Account
      await createSmartAccount();

      setIsConnecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası');
      setIsConnecting(false);
    }
  };

  // Create Smart Account
  const createSmartAccount = async () => {
    if (!eoa || !onMonad) return;

    try {
      const { createHybridSmartAccount } = await import('./smartAccount');
      const smartAccount = await createHybridSmartAccount();
      setSA(smartAccount.address);

      // Get balances
      await updateBalances();
    } catch (err) {
      console.error('Smart Account oluşturma hatası:', err);
      setError('Smart Account oluşturulamadı');
    }
  };

  // Update balances
  const updateBalances = async () => {
    if (!eoa || !sa) return;

    try {
      // Get native balance for both EOA and Smart Account
      const eoaBalance = await getNativeBalance(eoa);
      const saBalance = await getNativeBalance(sa);
      
      setSAMon(saBalance);
      
      // If Smart Account has balance, consider it "funded"
      if (saBalance > 0n) {
        setHasFauceted(true);
      }
    } catch (err) {
      console.error('Bakiye güncelleme hatası:', err);
    }
  };

  // Switch to Monad Testnet
  const switchToMonad = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2797' }], // 10143 in hex
      });
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x2797',
                chainName: 'Monad Testnet',
                nativeCurrency: {
                  name: 'Monad',
                  symbol: 'MON',
                  decimals: 18,
                },
                rpcUrls: ['https://testnet-rpc.monad.xyz'],
                blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
              },
            ],
          });
        } catch (addError) {
          setError('Monad Testnet eklenemedi');
        }
      } else {
        setError('Ağ değiştirilemedi');
      }
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setEOA(undefined);
    setSA(undefined);
    setOnMonad(false);
    setChainId(undefined);
    setSAMon(undefined);
    setHasFauceted(false);
    setError(null);
  };

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setEOA(undefined);
        setSA(undefined);
        setOnMonad(false);
      } else {
        // User switched accounts
        setEOA(accounts[0] as `0x${string}`);
        createSmartAccount();
      }
    };

    const handleChainChanged = (chainId: string) => {
      const chainIdNumber = parseInt(chainId, 16);
      setChainId(chainIdNumber);
      
      if (chainIdNumber === 10143) {
        setOnMonad(true);
        createSmartAccount();
      } else {
        setOnMonad(false);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [eoa, sa]);

  // Format balance for display
  const formatBalance = (balance: bigint | undefined, decimals: number = 18) => {
    if (!balance) return '0';
    return (Number(balance) / Math.pow(10, decimals)).toFixed(4);
  };

  return {
    // State
    eoa,
    sa,
    isConnected,
    isConnecting,
    onMonad,
    error,
    
    // Balances
    nativeBalance: saMon,
    formattedNativeBalance: formatBalance(saMon, 18),
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchToMonad,
    updateBalances,
    createSmartAccount,
    
    // Utils
    formatBalance,
  };
}
