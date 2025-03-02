# Telegram Anonymous Chat Mini App

A simple anonymous chat application for Telegram that allows users to chat with random people.

## Features

- **Anonymous Chat**: Chat with random people without revealing your identity
- **Real-time Messaging**: Instant message delivery using WebSockets
- **Next Partner**: Easily switch to a new chat partner at any time
- **Mobile Optimized**: Designed specifically for mobile devices with keyboard handling
- **Dark Mode Support**: Automatically adapts to Telegram's theme

## Tech Stack

### Frontend
- React.js
- TypeScript
- Socket.io-client
- TailwindCSS
- Telegram Web App API

### Backend
- Node.js
- Express
- Socket.io
- SQLite

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.tsx         # Main application component
│   │   ├── index.tsx       # Application entry point
│   │   ├── types.ts        # TypeScript type definitions
│   │   └── index.css       # Global styles
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
│
├── server/                 # Backend Node.js application
│   ├── src/
│   │   ├── server.js       # Main server implementation
│   │   └── db.js           # Database implementation
│   ├── index.js            # Server entry point
│   └── package.json        # Backend dependencies
│
└── package.json            # Root package.json for scripts
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/telegram-mini-chat.git
   cd telegram-mini-chat
   ```

2. Install dependencies:
   ```
   npm run setup
   ```

### Development

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:8080`

### Production Build

1. Build the application:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm start
   ```

## Telegram Bot Setup

1. Create a new bot using [@BotFather](https://t.me/BotFather) on Telegram
2. Set up a Mini App for your bot:
   ```
   /newapp
   ```
3. Follow the instructions and set the URL to your deployed application
4. Update your bot's menu button to open the Mini App

## Mobile Optimization

The application is optimized for mobile devices with the following features:

- Viewport adjustments for mobile browsers
- Keyboard handling to prevent UI jumping
- Safe area insets for notched devices
- Fixed input field that stays above the keyboard

## Database Schema

### Users Table
- `id`: INTEGER PRIMARY KEY
- `telegramId`: TEXT (Telegram user ID)
- `isActive`: BOOLEAN (User's active status)
- `currentChatPartnerId`: TEXT (Current chat partner's Telegram ID)
- `socketId`: TEXT (Socket.io connection ID)
- `lastActive`: DATETIME (Last activity timestamp)

### Messages Table
- `id`: INTEGER PRIMARY KEY
- `senderId`: TEXT (Sender's Telegram ID)
- `receiverId`: TEXT (Receiver's Telegram ID)
- `content`: TEXT (Message content)
- `timestamp`: DATETIME (Message timestamp)

## License

This project is licensed under the ISC License. 