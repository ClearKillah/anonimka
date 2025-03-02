import React from 'react';
import { StartScreenProps } from '../types';

const StartScreen: React.FC<StartScreenProps> = ({ onFindPartner }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Anonymous Chat
        </h1>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          Chat anonymously with random people. Your identity is never revealed.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={onFindPartner}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105"
          >
            Find a Chat Partner
          </button>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            <p>By using this service, you agree to our terms of service and privacy policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen; 