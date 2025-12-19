import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantUsername: string;
  participantAvatar?: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(id, updated_at)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const conversationList: Conversation[] = [];

      for (const p of participants || []) {
        const convId = p.conversation_id;

        // Get other participant
        const { data: otherParticipants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convId)
          .neq('user_id', user.id)
          .limit(1);

        if (!otherParticipants || otherParticipants.length === 0) continue;

        const otherUserId = otherParticipants[0].user_id;

        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', otherUserId)
          .maybeSingle();

        if (!profile) continue;

        // Get last message
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = messages?.[0];

        // Count unread messages
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', user.id)
          .neq('status', 'seen');

        conversationList.push({
          id: convId,
          participantId: otherUserId,
          participantName: profile.display_name || profile.username,
          participantUsername: profile.username,
          participantAvatar: profile.avatar_url,
          isOnline: profile.is_online || false,
          lastMessage: lastMsg?.content,
          lastMessageTime: lastMsg?.created_at,
          unreadCount: count || 0,
        });
      }

      // Sort by last message time
      conversationList.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setConversations(conversationList);
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Use the database function to create conversation with proper permissions
      const { data, error } = await supabase
        .rpc('create_conversation_with_participant', {
          other_user_id: otherUserId
        });

      if (error) throw error;

      await fetchConversations();
      return data as string;
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  return { conversations, loading, fetchConversations, createConversation };
};
