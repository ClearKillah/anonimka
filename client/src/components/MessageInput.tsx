import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  keyboardOpen: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, keyboardOpen }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 ${
        keyboardOpen ? 'fixed bottom-0 left-0 right-0' : ''
      }`}
    >
      <form onSubmit={handleSubmit} className="flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className={`bg-blue-500 text-white py-2 px-4 rounded-r-lg ${
            message.trim() ? 'hover:bg-blue-600' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default MessageInput; 