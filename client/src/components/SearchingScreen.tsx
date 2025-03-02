import React from 'react';
import { SearchingScreenProps } from '../types';

const SearchingScreen: React.FC<SearchingScreenProps> = ({ onCancel }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          Searching for a partner...
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Please wait while we connect you with someone to chat with
        </p>
        
        <button
          onClick={onCancel}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-6 rounded-lg transition duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SearchingScreen; 