import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';

import RegistrationScreen from './components/RegistrationScreen';
import SearchingScreen from './components/SearchingScreen';
import ChatScreen from './components/ChatScreen';
import { Message, User, TelegramWebApp } from './types';

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'https://anonimka-production.up.railway.app' 
  : 'http://localhost:5000';

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<{ partnerId: string; nickname: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [screen, setScreen] = useState<'registration' | 'searching' | 'chat'>('registration');

  // Initialize socket and set up listeners
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Set CSS variables from Telegram theme
      document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
      document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
      document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
      document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
      document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
      document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color);
    }

    // Setup viewport height for mobile browsers
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);

    return () => {
      if (newSocket) newSocket.disconnect();
      window.removeEventListener('resize', setVh);
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('registered', (userData: User) => {
      setUser(userData);
      setScreen('searching');
    });

    socket.on('searching', () => {
      setIsSearching(true);
    });

    socket.on('partnerFound', (partnerData) => {
      setPartner(partnerData);
      setIsSearching(false);
      setScreen('chat');
      socket.emit('getMessages', partnerData.partnerId);
    });

    socket.on('messages', (messageData: Message[]) => {
      setMessages(messageData);
    });

    socket.on('messageSent', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('messageReceived', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('partnerLeft', () => {
      setPartner(null);
      setMessages([]);
      setScreen('searching');
    });

    socket.on('waitingForPartner', () => {
      setPartner(null);
      setMessages([]);
      setIsSearching(true);
    });

    return () => {
      socket.off('registered');
      socket.off('searching');
      socket.off('partnerFound');
      socket.off('messages');
      socket.off('messageSent');
      socket.off('messageReceived');
      socket.off('partnerLeft');
      socket.off('waitingForPartner');
    };
  }, [socket]);

  const handleRegister = (nickname: string) => {
    if (socket) {
      socket.emit('register', nickname);
    }
  };

  const handleFindPartner = () => {
    if (socket) {
      setIsSearching(true);
      socket.emit('findPartner');
    }
  };

  const handleSendMessage = (content: string) => {
    if (socket && partner) {
      socket.emit('message', { content, receiverId: partner.partnerId });
    }
  };

  const handleNextPartner = () => {
    if (socket) {
      setScreen('searching');
      socket.emit('nextPartner');
    }
  };

  return (
    <div className="viewport-height">
      {screen === 'registration' && (
        <RegistrationScreen onRegister={handleRegister} />
      )}
      {screen === 'searching' && (
        <SearchingScreen onFind={handleFindPartner} isSearching={isSearching} />
      )}
      {screen === 'chat' && user && partner && (
        <ChatScreen
          user={user}
          partner={partner}
          messages={messages}
          onSendMessage={handleSendMessage}
          onNextPartner={handleNextPartner}
        />
      )}
    </div>
  );
};

export default App; 