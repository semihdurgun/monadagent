'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Plus,
  LogOut
} from 'lucide-react';
import { useWallet } from '@/lib/useWallet';
import { cn } from '@/lib/utils';

export function WalletConnection() {
  const {
    eoa,
    sa,
    isConnected,
    isConnecting,
    onMonad,
    error,
    nativeBalance,
    formattedNativeBalance,
    connectWallet,
    disconnectWallet,
    switchToMonad,
    updateBalances,
    createSmartAccount: createSA,
  } = useWallet();

  const [isCreatingSA, setIsCreatingSA] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const createSmartAccount = async () => {
    if (!eoa || !onMonad) return;
    
    setIsCreatingSA(true);
    try {
      await createSA();
    } catch (error) {
      console.error('Smart Account oluşturma hatası:', error);
    } finally {
      setIsCreatingSA(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address?.slice(0, 6)}...${address?.slice(-4)}`;
  };

  // Check if wallet is connected but no Smart Account
  const needsSmartAccount = isConnected && !sa;

  if (!isConnected) {
    return (
      <Card className="p-6 border-border/60 bg-background/40 backdrop-blur">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Cüzdan Bağlantısı Gerekli</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Chat'i kullanabilmek ve blockchain işlemlerini gerçekleştirebilmek için MetaMask cüzdanınızı bağlayın.
            </p>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button 
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bağlanıyor...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  MetaMask Bağla
                </>
              )}
            </Button>

            {!onMonad && isConnected && (
              <Button 
                onClick={switchToMonad}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Monad Testnet'e Geç
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <p>• Monad Testnet (Chain ID: 10143) gerekli</p>
            <p>• MetaMask eklentisi yüklü olmalı</p>
          </div>
        </div>
      </Card>
    );
  }

  if (needsSmartAccount) {
    return (
      <Card className="p-6 border-border/60 bg-background/40 backdrop-blur">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20">
            <Plus className="w-8 h-8 text-blue-500" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Smart Account Oluştur</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Blockchain işlemlerini gerçekleştirmek için Smart Account oluşturmanız gerekiyor.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-left">
            <div className="text-xs text-muted-foreground mb-1">EOA Adresi:</div>
            <div className="text-sm font-mono">{formatAddress(eoa!)}</div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={createSmartAccount}
              disabled={isCreatingSA}
              className="w-full"
              size="lg"
            >
              {isCreatingSA ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Smart Account Oluştur
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Smart Account, gelişmiş blockchain özelliklerini kullanmanızı sağlar.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-border/60 bg-background/40 backdrop-blur">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Cüzdan Bağlı</h4>
              <p className="text-xs text-muted-foreground">Monad Testnet</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              onClick={updateBalances}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={disconnectWallet}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              title="Cüzdanı Bağlantısını Kes"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">EOA:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono">{formatAddress(eoa!)}</span>
              <Button
                onClick={() => copyToClipboard(eoa!)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Smart Account:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono">{formatAddress(sa!)}</span>
              <Button
                onClick={() => copyToClipboard(sa!)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="text-center pt-2 border-t border-border/60">
          <div className="text-lg font-semibold text-primary">
            {formattedNativeBalance}
          </div>
          <div className="text-xs text-muted-foreground">MON</div>
        </div>

        {/* Network Status */}
        <div className={cn(
          "flex items-center justify-center gap-2 p-2 rounded-md text-xs",
          onMonad 
            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" 
            : "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
        )}>
          {onMonad ? (
            <>
              <CheckCircle className="w-3 h-3" />
              Monad Testnet Bağlı
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" />
              Yanlış Ağ - Monad Testnet'e Geçin
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
