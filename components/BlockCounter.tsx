import React, { useEffect, useState } from 'react';

interface BlockData {
  number: string;
  commitState?: string;
  blockId?: string;
}

const BlockCounter: React.FC = () => {
  const [currentBlock, setCurrentBlock] = useState<string>('0');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        setConnectionStatus('connecting');
        
        ws = new WebSocket('wss://testnet-rpc.monad.xyz');

        ws.onopen = () => {
          console.log('WebSocket connected to Monad testnet');
          setIsConnected(true);
          setConnectionStatus('connected');
          
          const subscribeMessage = {
            id: 1,
            jsonrpc: "2.0",
            method: "eth_subscribe",
            params: ["newHeads"]
          };
          
          ws?.send(JSON.stringify(subscribeMessage));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.id === 1 && data.result) {
              return;
            }
            
            if (data.method === 'eth_subscription' && data.params?.result) {
              const blockData: BlockData = data.params.result;
              const blockNumber = parseInt(blockData.number, 16).toString();
              setCurrentBlock(blockNumber);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          setConnectionStatus('disconnected');
          
          reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
          }, 5000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('disconnected');
        };

      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Son Blok</span>
        <span className="font-mono text-sm">#{currentBlock}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' : 
          connectionStatus === 'connecting' ? 'bg-yellow-500' : 
          'bg-red-500'
        }`} />
        <span className="text-xs text-muted-foreground">
          {connectionStatus === 'connected' && 'Live'}
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Offline'}
        </span>
      </div>
    </div>
  );
};

export default BlockCounter; 