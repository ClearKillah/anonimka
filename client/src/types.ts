export interface User {
  id: number;
  telegramId: string;
  isActive: boolean;
  currentChatPartnerId: string | null;
  socketId: string | null;
  lastActive: string;
}

export interface Message {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isOwn?: boolean;
}

export interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
  onEvent: (eventType: string, eventHandler: Function) => void;
  offEvent: (eventType: string, eventHandler?: Function) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
  };
}

export interface StartScreenProps {
  onFindPartner: () => void;
}

export interface SearchingScreenProps {
  onCancel?: () => void;
}

export interface ChatScreenProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onNextPartner: () => void;
  keyboardOpen: boolean;
  viewportHeight: number;
} 