import React from 'react';
import { StartScreenProps } from '../types';

const StartScreen: React.FC<StartScreenProps> = ({ onFindPartner }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Anonymous Chat</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Chat with random people from around the world
        </p>
      </div>
      
      <button
        onClick={onFindPartner}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
      >
        Find a Chat Partner
      </button>
      
      <div className="mt-8 text-sm text-gray-500 dark:text-gray-400 max-w-md">
        <p className="mb-2">
          Press the button to start chatting with a random person.
          You can switch to a new partner at any time.
        </p>
        <p>
          Remember to be respectful and follow community guidelines.
        </p>
      </div>
    </div>
  );
};

export default StartScreen; 