import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';

import StartScreen from './components/StartScreen';
import SearchingScreen from './components/SearchingScreen';
import ChatScreen from './components/ChatScreen';
import { Message, TelegramWebApp } from './types';

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin
  : 'http://localhost:5000';

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [partner, setPartner] = useState<{ telegramId: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [screen, setScreen] = useState<'start' | 'searching' | 'chat'>('start');
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  
  const tgMainButton = useRef<any>(null);

  useEffect(() => {
    console.log('Connecting to socket server:', SOCKET_URL);
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setSocketConnected(true);
      setError(null);
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setSocketConnected(false);
      setError('Connection error. Please try again later.');
    });
    
    newSocket.on('error', (data) => {
      console.error('Socket error:', data);
      setError(data.message || 'An error occurred');
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Initialize Telegram Web App
  useEffect(() => {
    const handleTelegramWebAppReady = () => {
      if (window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        
        // Initialize Telegram Web App
        webApp.ready();
        
        // Set viewport height
        webApp.expand();
        
        // Get user ID from Telegram
        if (webApp.initDataUnsafe?.user?.id) {
          setTelegramId(webApp.initDataUnsafe.user.id.toString());
        } else {
          // For development, use a random ID
          if (process.env.NODE_ENV !== 'production') {
            setTelegramId(`dev_${Math.floor(Math.random() * 10000)}`);
          }
        }
        
        // Initialize main button
        tgMainButton.current = webApp.MainButton;
      } else if (process.env.NODE_ENV !== 'production') {
        // For development without Telegram
        setTelegramId(`dev_${Math.floor(Math.random() * 10000)}`);
      }
    };
    
    handleTelegramWebAppReady();
    
    // Handle viewport changes for mobile keyboard
    const handleResize = () => {
      const newHeight = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(newHeight);
      
      // Detect if keyboard is open
      const heightDiff = window.innerHeight - newHeight;
      setKeyboardOpen(heightDiff > 150);
    };
    
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize user when telegramId is available
  useEffect(() => {
    if (socket && telegramId && socketConnected) {
      socket.emit('init', { telegramId });
      
      socket.on('init_success', (data) => {
        console.log('Initialization successful:', data);
        
        // If user already has a chat partner, go to chat screen
        if (data.user.currentChatPartnerId) {
          // Wait for chat_started event
        } else {
          setScreen('start');
        }
      });
      
      socket.on('searching', () => {
        setScreen('searching');
        setPartner(null);
        setMessages([]);
      });
      
      socket.on('chat_started', (data) => {
        console.log('Chat started:', data);
        setPartner(data.partner);
        setMessages(data.messages || []);
        setScreen('chat');
      });
      
      socket.on('chat_ended', (data) => {
        console.log('Chat ended:', data);
        setPartner(null);
        setMessages([]);
        setScreen('start');
      });
      
      socket.on('message', (message) => {
        setMessages(prevMessages => [...prevMessages, message]);
      });
      
      socket.on('partner_disconnected', () => {
        setError('Your partner has disconnected');
        setPartner(null);
        setScreen('start');
      });
      
      return () => {
        socket.off('init_success');
        socket.off('searching');
        socket.off('chat_started');
        socket.off('chat_ended');
        socket.off('message');
        socket.off('partner_disconnected');
      };
    }
  }, [socket, telegramId, socketConnected]);

  // Handle main button for finding partner
  useEffect(() => {
    if (tgMainButton.current && screen === 'start') {
      tgMainButton.current.setText('Find a chat partner');
      tgMainButton.current.show();
      tgMainButton.current.onClick(handleFindPartner);
    } else if (tgMainButton.current) {
      tgMainButton.current.hide();
      tgMainButton.current.offClick(handleFindPartner);
    }
    
    return () => {
      if (tgMainButton.current) {
        tgMainButton.current.offClick(handleFindPartner);
      }
    };
  }, [screen]);

  const handleFindPartner = () => {
    if (socket && socketConnected) {
      socket.emit('find_partner');
    }
  };

  const handleSendMessage = (content: string) => {
    if (socket && socketConnected && partner) {
      socket.emit('send_message', { content });
    }
  };

  const handleNextPartner = () => {
    if (socket && socketConnected) {
      socket.emit('next_partner');
    }
  };

  // Render appropriate screen
  const renderScreen = () => {
    if (!socketConnected) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="text-center">
            <p className="text-lg mb-2">Connecting to server...</p>
            {error && <p className="text-red-500">{error}</p>}
          </div>
        </div>
      );
    }

    if (!telegramId) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="text-center">
            <p className="text-lg mb-2">Initializing Telegram Web App...</p>
          </div>
        </div>
      );
    }

    switch (screen) {
      case 'start':
        return <StartScreen onFindPartner={handleFindPartner} />;
      case 'searching':
        return <SearchingScreen />;
      case 'chat':
        return (
          <ChatScreen
            messages={messages}
            onSendMessage={handleSendMessage}
            onNextPartner={handleNextPartner}
            keyboardOpen={keyboardOpen}
            viewportHeight={viewportHeight}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="app-container bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      style={{ 
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden'
      }}
    >
      {renderScreen()}
    </div>
  );
};

export default App; 