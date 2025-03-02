import React from 'react';
import Chat from '../components/Chat';

const ChatPage: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Chat />
    </div>
  );
};

export default ChatPage; 