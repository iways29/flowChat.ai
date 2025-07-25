import React from 'react';
import { Send, History } from 'lucide-react';
import { Message } from '../../types/conversation.ts';
import { MessageHelpers } from '../../utils/messageHelpers.ts';

interface ChatInputProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  canSendMessage: boolean;
  isLoading: boolean;
  selectedMessageId: string;
  currentMessage: Message | null;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  onInputChange,
  onSendMessage,
  canSendMessage,
  isLoading,
  selectedMessageId,
  currentMessage
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSendMessage) {
        onSendMessage();
      }
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-6">
      <div className="flex gap-3 items-end">
        <textarea
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={selectedMessageId ? "Reply to selected message..." : "Start a new conversation..."}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none min-h-[44px] max-h-32 overflow-y-auto"
          disabled={isLoading}
          rows={1}
          style={{
            height: 'auto',
            minHeight: '44px'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`; // 128px = max-h-32
          }}
        />
        <button
          onClick={onSendMessage}
          disabled={!canSendMessage}
          className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium flex-shrink-0"
        >
          <Send size={16} />
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {selectedMessageId && currentMessage && (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
          <History size={12} />
          Replying to: {MessageHelpers.truncateText(currentMessage.content, 60)}
        </div>
      )}
    </div>
  );
};