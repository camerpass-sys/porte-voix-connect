import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineStatus } from './OnlineStatus';
import { Conversation } from '@/hooks/useConversations';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
  isActive?: boolean;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onClick,
  isActive,
}) => {
  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: fr });
    }
    
    if (isYesterday(date)) {
      return 'Hier';
    }
    
    return format(date, 'dd/MM/yy', { locale: fr });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'contact-card',
        isActive && 'bg-secondary'
      )}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={conversation.participantAvatar} alt={conversation.participantName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {conversation.participantName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatus isOnline={conversation.isOnline} size="md" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground truncate">
            {conversation.participantName}
          </h3>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatLastMessageTime(conversation.lastMessageTime)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-muted-foreground truncate">
            {conversation.lastMessage || 'Aucun message'}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
