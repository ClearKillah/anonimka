import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import MessageInput from './MessageInput';

interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Получение имени пользователя при загрузке компонента
  useEffect(() => {
    const storedUsername = localStorage.getItem('telegram-chat-username');
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      const newUsername = prompt('Введите ваше имя:') || 'Гость ' + Math.floor(Math.random() * 1000);
      localStorage.setItem('telegram-chat-username', newUsername);
      setUsername(newUsername);
    }
    
    // Загрузка сообщений с сервера
    fetchMessages();
    
    // Установка интервала для периодического обновления сообщений
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  // Прокрутка к последнему сообщению при добавлении новых
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages');
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
    }
  };

  const sendMessage = async (text: string) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: username, text }),
      });
      
      if (response.ok) {
        const newMessage = await response.json();
        setMessages([...messages, newMessage]);
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-blue-500 text-white p-4">
        <h1 className="text-xl font-bold">Telegram Мини-Чат</h1>
        <p className="text-sm">Вы вошли как: {username}</p>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            Нет сообщений. Будьте первым!
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              user={message.user}
              text={message.text}
              timestamp={message.timestamp}
              isMine={message.user === username}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput onSendMessage={sendMessage} />
    </div>
  );
};

export default Chat; 