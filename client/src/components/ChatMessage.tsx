import React from 'react';

interface ChatMessageProps {
  user: string;
  text: string;
  timestamp: string;
  isMine: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ user, text, timestamp, isMine }) => {
  const messageTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isMine ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
        {!isMine && <div className="font-bold text-sm">{user}</div>}
        <div className="break-words">{text}</div>
        <div className="text-xs text-right mt-1 opacity-70">{messageTime}</div>
      </div>
    </div>
  );
};

export default ChatMessage; 