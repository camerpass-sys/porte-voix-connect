import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2 p-3 bg-card border-t border-border safe-area-bottom">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Smile className="w-5 h-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Paperclip className="w-5 h-5" />
      </Button>

      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Écrire un message..."
          className="message-input w-full text-sm"
          disabled={disabled}
        />
      </div>

      {message.trim() ? (
        <Button
          onClick={handleSend}
          disabled={disabled}
          size="icon"
          className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};
