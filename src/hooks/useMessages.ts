import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  saveMessageLocally, 
  getOfflineMessages, 
  markMessageSynced, 
  isOnline,
  getUnsyncedMessages 
} from '@/services/OfflineMessageService';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  status: 'pending' | 'sent' | 'delivered' | 'seen';
  createdAt: string;
  deliveredAt?: string;
  seenAt?: string;
  isMine: boolean;
}

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync offline messages when coming back online
  const syncOfflineMessages = useCallback(async () => {
    if (!isOnline() || !user) return;

    const unsyncedMessages = getUnsyncedMessages();
    for (const msg of unsyncedMessages) {
      try {
        const { error } = await supabase.from('messages').insert({
          id: msg.id,
          conversation_id: msg.conversationId,
          sender_id: msg.senderId,
          content: msg.content,
          status: 'sent',
          created_at: msg.createdAt,
        });

        if (!error) {
          markMessageSynced(msg.id);
        }
      } catch (error) {
        console.error('[Messages] Erreur sync message:', error);
      }
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      // First, try to get messages from the server
      if (isOnline()) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedMessages: Message[] = (data || []).map((msg) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.sender_id,
          status: msg.status as Message['status'],
          createdAt: msg.created_at,
          deliveredAt: msg.delivered_at,
          seenAt: msg.seen_at,
          isMine: msg.sender_id === user.id,
        }));

        // Merge with local offline messages for this conversation
        const offlineMessages = getOfflineMessages()
          .filter(m => m.conversationId === conversationId && !m.synced)
          .map(m => ({
            id: m.id,
            content: m.content,
            senderId: m.senderId,
            status: 'pending' as const,
            createdAt: m.createdAt,
            isMine: m.senderId === user.id,
          }));

        // Remove duplicates
        const allMessages = [...formattedMessages];
        offlineMessages.forEach(offline => {
          if (!allMessages.some(m => m.id === offline.id)) {
            allMessages.push(offline);
          }
        });

        // Sort by date
        allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(allMessages);

        // Mark messages as seen
        const unreadMessages = data?.filter(
          (msg) => msg.sender_id !== user.id && msg.status !== 'seen'
        );

        if (unreadMessages && unreadMessages.length > 0) {
          for (const msg of unreadMessages) {
            await supabase
              .from('messages')
              .update({ status: 'seen', seen_at: new Date().toISOString() })
              .eq('id', msg.id);
          }
        }
      } else {
        // Offline: get from local storage only
        const offlineMessages = getOfflineMessages()
          .filter(m => m.conversationId === conversationId)
          .map(m => ({
            id: m.id,
            content: m.content,
            senderId: m.senderId,
            status: (m.synced ? 'sent' : 'pending') as Message['status'],
            createdAt: m.createdAt,
            isMine: m.senderId === user.id,
          }));

        setMessages(offlineMessages);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      
      // Fallback to offline messages on error
      const offlineMessages = getOfflineMessages()
        .filter(m => m.conversationId === conversationId)
        .map(m => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          status: (m.synced ? 'sent' : 'pending') as Message['status'],
          createdAt: m.createdAt,
          isMine: m.senderId === user.id,
        }));
      setMessages(offlineMessages);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  const sendMessage = async (content: string): Promise<boolean> => {
    if (!conversationId || !user || !content.trim()) return false;

    const messageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Add message to local state immediately for instant feedback
    const newMessage: Message = {
      id: messageId,
      content: content.trim(),
      senderId: user.id,
      status: isOnline() ? 'sent' : 'pending',
      createdAt,
      isMine: true,
    };

    setMessages(prev => [...prev, newMessage]);

    // Save locally first for offline support
    saveMessageLocally({
      id: messageId,
      conversationId,
      senderId: user.id,
      recipientId: '', // Will be determined by conversation
      content: content.trim(),
      createdAt,
      synced: false,
    });

    // If online, sync to server
    if (isOnline()) {
      try {
        const { error } = await supabase.from('messages').insert({
          id: messageId,
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          status: 'sent',
          created_at: createdAt,
        });

        if (error) throw error;

        // Mark as synced
        markMessageSynced(messageId);

        // Update message status in local state
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, status: 'sent' } : m
        ));

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        return true;
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        // Keep in pending state, will sync later
        return false;
      }
    }

    return true; // Message saved locally
  };

  // Sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineMessages();
      fetchMessages();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncOfflineMessages, fetchMessages]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Subscribe to realtime messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Handle new message from other user
          if (payload.eventType === 'INSERT' && payload.new) {
            const msg = payload.new as any;
            if (msg.sender_id !== user?.id) {
              const newMessage: Message = {
                id: msg.id,
                content: msg.content,
                senderId: msg.sender_id,
                status: msg.status as Message['status'],
                createdAt: msg.created_at,
                deliveredAt: msg.delivered_at,
                seenAt: msg.seen_at,
                isMine: false,
              };
              
              setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, newMessage];
              });

              // Mark as seen immediately
              supabase
                .from('messages')
                .update({ status: 'seen', seen_at: new Date().toISOString() })
                .eq('id', msg.id);
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const msg = payload.new as any;
            setMessages(prev => prev.map(m => 
              m.id === msg.id ? {
                ...m,
                status: msg.status,
                deliveredAt: msg.delivered_at,
                seenAt: msg.seen_at,
              } : m
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages, user]);

  return { messages, loading, sendMessage, fetchMessages };
};
