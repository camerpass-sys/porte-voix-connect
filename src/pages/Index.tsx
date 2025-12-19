import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from './AuthPage';
import { HomePage } from './HomePage';
import { ChatView } from '@/components/chat/ChatView';
import { Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [activeChat, setActiveChat] = useState<{
    conversationId: string;
    participantName: string;
    participantAvatar?: string;
    isOnline: boolean;
  } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (activeChat) {
    return (
      <ChatView
        conversationId={activeChat.conversationId}
        participantName={activeChat.participantName}
        participantAvatar={activeChat.participantAvatar}
        isOnline={activeChat.isOnline}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return (
    <HomePage
      onOpenChat={(conversationId, participantName, participantAvatar, isOnline) => {
        setActiveChat({
          conversationId,
          participantName,
          participantAvatar,
          isOnline: isOnline || false,
        });
      }}
    />
  );
};

export default Index;
