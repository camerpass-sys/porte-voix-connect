import React from 'react';
import { MessageStatus } from './MessageStatus';
import { cn } from '@/lib/utils';
import { Message } from '@/hooks/useMessages';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: fr });
  };

  return (
    <div
      className={cn(
        'flex mb-2 animate-fade-in',
        message.isMine ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] break-words',
          message.isMine ? 'message-bubble-sent' : 'message-bubble-received'
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1',
            message.isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          <span className="text-[10px]">{formatTime(message.createdAt)}</span>
          {message.isMine && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
};
