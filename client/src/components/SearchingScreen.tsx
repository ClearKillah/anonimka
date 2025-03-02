import React from 'react';
import { SearchingScreenProps } from '../types';

const SearchingScreen: React.FC<SearchingScreenProps> = ({ onCancel }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-4">Looking for a chat partner...</h2>
        
        {/* Loading animation */}
        <div className="flex justify-center mb-6">
          <div className="animate-pulse flex space-x-4">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animation-delay-200"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animation-delay-400"></div>
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we find someone for you to chat with
        </p>
      </div>
      
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition duration-200"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default SearchingScreen; 