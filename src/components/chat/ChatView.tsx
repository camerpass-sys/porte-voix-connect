import React, { useRef, useEffect } from 'react';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  conversationId: string;
  participantName: string;
  participantAvatar?: string;
  isOnline: boolean;
  onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversationId,
  participantName,
  participantAvatar,
  isOnline,
  onBack,
}) => {
  const { messages, loading, sendMessage } = useMessages(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader
        name={participantName}
        avatarUrl={participantAvatar}
        isOnline={isOnline}
        onBack={onBack}
      />

      <div 
        className={cn(
          'flex-1 overflow-y-auto px-3 py-4 chat-scrollbar',
          'bg-[url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%230a84ff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")]'
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="font-semibold text-lg mb-1">Démarrez la conversation</h3>
            <p className="text-sm text-muted-foreground">
              Envoyez votre premier message à {participantName}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput onSend={handleSend} />
    </div>
  );
};
