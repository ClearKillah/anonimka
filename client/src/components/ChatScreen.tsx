import React, { useState, useRef, useEffect } from 'react';
import { ChatScreenProps, Message } from '../types';

const ChatScreen: React.FC<ChatScreenProps> = ({ 
  messages, 
  onSendMessage, 
  onNextPartner,
  keyboardOpen,
  viewportHeight
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Scroll to bottom when keyboard opens/closes
  useEffect(() => {
    scrollToBottom();
  }, [keyboardOpen]);
  
  // Обработка изменений в Telegram Mini App
  useEffect(() => {
    // Функция для обработки изменений viewport
    const handleViewportChange = () => {
      scrollToBottom();
    };
    
    // Подписываемся на события Telegram Mini App
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.onEvent('viewportChanged', handleViewportChange);
    }
    
    return () => {
      // Отписываемся от событий
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.offEvent('viewportChanged', handleViewportChange);
      }
    };
  }, []);
  
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      
      // Re-focus the input after sending
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 0);
    }
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
        <div>
          <h2 className="font-semibold">Anonymous Chat</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Connected with a random person</p>
        </div>
        <button
          onClick={onNextPartner}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg transition duration-200"
        >
          Next Partner
        </button>
      </div>
      
      {/* Messages */}
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 message-list"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Say hello to your new chat partner!
            </p>
          </div>
        ) : (
          messages.map((message: Message) => (
            <div 
              key={message.id} 
              className={`mb-4 flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  message.isOwn 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                }`}
              >
                <div className="break-words">{message.content}</div>
                <div 
                  className={`text-xs mt-1 ${
                    message.isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            onFocus={scrollToBottom}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className={`bg-blue-500 text-white py-2 px-4 rounded-r-lg ${
              inputValue.trim() ? 'hover:bg-blue-600' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatScreen; 