'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { DemoPanel } from '@/components/demo/DemoPanel';
import { BlockchainDelegationDemo } from '@/components/demo/BlockchainDelegationDemo';
import { WalletConnection } from '@/components/wallet/WalletConnection';
import BlockCounter from '@/components/BlockCounter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Zap, Shield, Globe, Play, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'demo' | 'blockchain'>('chat');

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10">
                <Image src="/mon.jpeg" alt="Monad Logo" width={32} height={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Monad Agent</h1>
                <p className="text-xs text-muted-foreground">AI Powered Assistant</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-4">
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={activeTab === 'chat' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('chat')}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Chat
                </Button>
                {/* <Button
                  variant={activeTab === 'demo' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('demo')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Demo
                </Button> */}
                {/* <Button
                  variant={activeTab === 'blockchain' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('blockchain')}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Blockchain Delegation
                </Button> */}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-4 mt-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'chat' ? (
              <Card className="h-[600px] border-border/60 bg-background/40 backdrop-blur">
                <ChatInterface />
              </Card>
            ) : activeTab === 'demo' ? (
              <Card className="border-border/60 bg-background/40 backdrop-blur">
                <div className="p-6">
                  <DemoPanel />
                </div>
              </Card>
            ) : activeTab === 'blockchain' ? (
              <Card className="border-border/60 bg-background/40 backdrop-blur">
                <div className="p-6">
                  <BlockchainDelegationDemo />
                </div>
              </Card>
            ) : (
              <Card className="border-border/60 bg-background/40 backdrop-blur">
                <div className="p-6">
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Connection */}
            <WalletConnection />


            {/* Stats */}
            <Card className="p-6 border-border/60 bg-background/40 backdrop-blur">
              <h3 className="font-semibold mb-4">Ağ Durumu</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monad Testnet</span>
                  <span className="text-green-500 font-medium">Çevrimiçi</span>
                </div>
                <BlockCounter />
                <div className="flex justify-between">
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              <p>© 2025 Monad Agent</p>
              <p>
                <a 
                  href="https://twitter.com/semih_durgun" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  semihdurgun
                </a>
                {' | '}
                <a 
                  href="https://twitter.com/0xİlh" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  İlhami
                </a>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span>Chain: Monad Testnet (10143)</span>
              <span>•</span>
              <span>AI Agent v1.0</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}