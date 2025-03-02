import React from 'react';

interface SearchingScreenProps {
  onFind: () => void;
  isSearching: boolean;
}

const SearchingScreen: React.FC<SearchingScreenProps> = ({ onFind, isSearching }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 text-center">
        <h1 className="text-2xl font-bold mb-6">Анонимный Чат</h1>
        
        {isSearching ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" 
                   style={{ borderColor: 'var(--tg-theme-button-color)' }}></div>
            </div>
            <p className="text-lg">Поиск собеседника...</p>
          </div>
        ) : (
          <button
            onClick={onFind}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg"
            style={{ 
              backgroundColor: 'var(--tg-theme-button-color)', 
              color: 'var(--tg-theme-button-text-color)' 
            }}
          >
            Найти собеседника
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchingScreen; 