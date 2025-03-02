import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';
import Chat from './components/Chat';

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
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(`Ошибка соединения: ${err.message}`);
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSocketConnected(false);
    });

    setSocket(newSocket);

    // Добавляем периодическую отправку heartbeat
    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        console.log('Sending heartbeat');
        newSocket.emit('heartbeat');
      }
    }, 15000); // каждые 15 секунд

    // Инициализация Telegram WebApp
    const handleTelegramWebAppReady = () => {
      // @ts-ignore
      window.Telegram.WebApp.ready();
      // @ts-ignore
      window.Telegram.WebApp.expand();
    };

    if (window.Telegram) {
      handleTelegramWebAppReady();
    } else {
      document.addEventListener('DOMContentLoaded', handleTelegramWebAppReady);
    }

    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);

    return () => {
      if (newSocket) newSocket.disconnect();
      window.removeEventListener('resize', setVh);
      clearInterval(heartbeatInterval); // очищаем интервал
      document.removeEventListener('DOMContentLoaded', handleTelegramWebAppReady);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('registered', (userData: User) => {
      console.log('Registered:', userData);
      setUser(userData);
      
      // При успешной регистрации показываем экран поиска
      setIsSearching(false);
      setScreen('searching');
    });

    socket.on('searching', () => {
      console.log('Searching for partner');
      setIsSearching(true);
      // После регистрации показываем экран поиска
      setScreen('searching');
    });

    socket.on('partnerFound', (partnerData) => {
      console.log('Partner found:', partnerData);
      setPartner(partnerData);
      setIsSearching(false);
      setScreen('chat');
      socket.emit('getMessages', partnerData.partnerId);
    });

    socket.on('messages', (messageData: Message[]) => {
      console.log('Messages received:', messageData);
      setMessages(messageData);
    });

    socket.on('messageSent', (message: Message) => {
      console.log('Message sent:', message);
      setMessages(prev => [...prev, message]);
    });

    socket.on('messageReceived', (message: Message) => {
      console.log('Message received:', message);
      setMessages(prev => [...prev, message]);
    });

    socket.on('partnerLeft', () => {
      console.log('Partner left');
      setPartner(null);
      setMessages([]);
      setScreen('searching');
    });

    socket.on('waitingForPartner', () => {
      console.log('Waiting for partner');
      setPartner(null);
      setMessages([]);
      setIsSearching(true);
    });

    socket.on('error', (errorMsg) => {
      console.error('Socket error:', errorMsg);
      setError(errorMsg);
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
      socket.off('error');
    };
  }, [socket]);

  const handleRegister = (nickname: string) => {
    console.log('Registering with nickname:', nickname);
    if (socket) {
      if (socket.connected) {
        console.log('Emitting register event');
        socket.emit('register', nickname);
        // Показываем загрузку в компоненте RegistrationScreen
      } else {
        console.error('Socket not connected');
        setError('Соединение с сервером потеряно. Перезагрузите страницу.');
      }
    } else {
      console.error('Socket not available');
      setError('Соединение с сервером не установлено');
    }
  };

  const handleFindPartner = () => {
    console.log('Finding partner');
    if (socket) {
      setIsSearching(true);
      socket.emit('findPartner');
    }
  };

  const handleSendMessage = (content: string) => {
    console.log('Sending message:', content);
    if (socket && partner) {
      socket.emit('message', { content, receiverId: partner.partnerId });
    }
  };

  const handleNextPartner = () => {
    console.log('Finding next partner');
    if (socket) {
      setScreen('searching');
      socket.emit('nextPartner');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded fixed top-0 left-0 right-0 z-50">
          {error}
        </div>
      )}
      
      {!socketConnected && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 text-yellow-800 p-2 text-center z-50">
          Подключение к серверу...
        </div>
      )}
      
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
      <Chat />
    </div>
  );
};

export default App; 