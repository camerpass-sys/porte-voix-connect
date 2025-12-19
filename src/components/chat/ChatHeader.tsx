import React from 'react';
import { ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineStatus } from './OnlineStatus';

interface ChatHeaderProps {
  name: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen?: string;
  onBack: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  name,
  avatarUrl,
  isOnline,
  lastSeen,
  onBack,
}) => {
  const getLastSeenText = () => {
    if (isOnline) return 'En ligne';
    if (!lastSeen) return 'Hors ligne';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`;
    return `Vu(e) le ${date.toLocaleDateString('fr-FR')}`;
  };

  return (
    <header className="chat-header px-2 py-3 flex items-center gap-2 safe-area-top">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="text-primary-foreground hover:bg-primary-foreground/10"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <Avatar className="w-10 h-10 border-2 border-primary-foreground/20">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-primary-foreground truncate">{name}</h2>
        <div className="flex items-center gap-1">
          <OnlineStatus isOnline={isOnline} size="sm" />
          <span className="text-xs text-primary-foreground/70">{getLastSeenText()}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <Video className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <Phone className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
