import React, { useState, useRef, useEffect } from 'react';
import { Message, User } from '../types';

interface ChatScreenProps {
  user: User;
  partner: { partnerId: string; nickname: string };
  messages: Message[];
  onSendMessage: (content: string) => void;
  onNextPartner: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ 
  user, 
  partner, 
  messages, 
  onSendMessage, 
  onNextPartner 
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    };

    window.visualViewport?.addEventListener('resize', updateViewportHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, viewportHeight]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="font-semibold">{partner.nickname}</h2>
          <p className="text-sm text-gray-500">Онлайн</p>
        </div>
        <button
          onClick={onNextPartner}
          className="px-3 py-1 bg-red-500 text-white rounded-md text-sm"
          style={{ 
            backgroundColor: 'var(--tg-theme-button-color)', 
            color: 'var(--tg-theme-button-text-color)' 
          }}
        >
          Следующий собеседник
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 message-list">
        <div className="space-y-3">
          {messages.map((message) => {
            const isOwn = message.senderId === user.userId;
            
            return (
              <div 
                key={message._id} 
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${
                    isOwn 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                  style={isOwn ? { 
                    backgroundColor: 'var(--tg-theme-button-color)', 
                    color: 'var(--tg-theme-button-text-color)' 
                  } : {}}
                >
                  <p className="break-words">{message.content}</p>
                  <p className={`text-xs mt-1 text-right ${isOwn ? 'text-gray-200' : 'text-gray-500'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div 
        className="input-container" 
        style={{ bottom: `${window.innerHeight - viewportHeight}px` }}
      >
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Введите сообщение..."
            autoComplete="off"
          />
          <button
            type="submit"
            className="p-2 bg-blue-500 text-white rounded-md"
            style={{ 
              backgroundColor: 'var(--tg-theme-button-color)', 
              color: 'var(--tg-theme-button-text-color)' 
            }}
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatScreen; 