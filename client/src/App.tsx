import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './index.css';

import StartScreen from './components/StartScreen';
import SearchingScreen from './components/SearchingScreen';
import ChatScreen from './components/ChatScreen';
import { Message, TelegramWebApp } from './types';

// Расширяем глобальный интерфейс Window для Telegram WebApp
declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

// Определяем состояния приложения
enum AppState {
  START,
  SEARCHING,
  CHAT
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.START);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const tgMainButton = useRef<any>(null);

  // Инициализация сокета
  useEffect(() => {
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin
      : 'http://localhost:3001';
    
    const newSocket = io(apiUrl);
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setSocketConnected(true);
      setError(null);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });
    
    newSocket.on('chat-start', (data) => {
      console.log('Chat started', data);
      setAppState(AppState.CHAT);
      setMessages([]);
    });
    
    newSocket.on('message', (data) => {
      console.log('Message received', data);
      setMessages((prevMessages) => [...prevMessages, { ...data, isOwn: false }]);
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
        
        // Отключаем вертикальные свайпы для предотвращения закрытия приложения
        if (typeof webApp.enableClosingConfirmation === 'function') {
          webApp.enableClosingConfirmation();
        }
        
        // Отключаем свайпы для предотвращения закрытия приложения
        if (typeof webApp.disableSwipe === 'function') {
          webApp.disableSwipe();
        }
        
        // Отключаем вертикальные свайпы для предотвращения закрытия приложения
        if (typeof webApp.disableVerticalSwipes === 'function') {
          webApp.disableVerticalSwipes();
        }
      } else if (process.env.NODE_ENV !== 'production') {
        // For development without Telegram
        setTelegramId(`dev_${Math.floor(Math.random() * 10000)}`);
      }
    };
    
    handleTelegramWebAppReady();
    
    // Обработка изменений размера viewport
    const handleResize = () => {
      if (window.visualViewport) {
        const newHeight = window.visualViewport.height;
        setViewportHeight(newHeight);
        
        // Detect if keyboard is open
        const heightDiff = window.innerHeight - newHeight;
        const isKeyboardOpen = heightDiff > 150;
        setKeyboardOpen(isKeyboardOpen);
      }
    };
    
    // Добавляем обработчики событий для отслеживания клавиатуры
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    
    // Принудительно вызываем обработчик при монтировании
    setTimeout(handleResize, 100);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
      
      // Clean up Telegram event listeners
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.offEvent('viewportChanged');
      }
    };
  }, []);

  // Register user when telegramId is available
  useEffect(() => {
    if (telegramId && socket && socketConnected) {
      console.log('Registering user with ID:', telegramId);
      socket.emit('register', { telegramId });
    }
  }, [telegramId, socket, socketConnected]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Error:', error);
      // Reset to start screen on error
      setAppState(AppState.START);
    }
  }, [error]);

  // Handle app state changes
  useEffect(() => {
    if (appState === AppState.SEARCHING) {
      if (socket && socketConnected) {
        socket.emit('find-partner', { telegramId });
      }
    }
  }, [appState, socket, socketConnected, telegramId]);

  const handleFindPartner = () => {
    setError(null);
    setAppState(AppState.SEARCHING);
  };

  const handleSendMessage = (content: string) => {
    if (socket && socketConnected && telegramId) {
      const message = { content, senderId: telegramId, timestamp: new Date().toISOString() };
      socket.emit('message', message);
      setMessages((prevMessages) => [...prevMessages, { ...message, id: Date.now(), receiverId: '', isOwn: true }]);
    }
  };

  const handleNextPartner = () => {
    setMessages([]);
    setAppState(AppState.SEARCHING);
    if (socket && socketConnected) {
      socket.emit('next-partner', { telegramId });
    }
  };

  const renderScreen = () => {
    switch (appState) {
      case AppState.START:
        return <StartScreen onFindPartner={handleFindPartner} />;
      case AppState.SEARCHING:
        return <SearchingScreen onCancel={() => setAppState(AppState.START)} />;
      case AppState.CHAT:
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
        return <div>Unknown state</div>;
    }
  };

  return (
    <div className="app-container">
      {renderScreen()}
    </div>
  );
};

export default App; 