import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getOfflineMessages, getSavedContacts } from '@/services/OfflineMessageService';

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

// Storage key for offline conversations
const CONVERSATIONS_KEY = 'connktus_conversations';

// Get stored conversations from localStorage
const getStoredConversations = (): Conversation[] => {
  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save conversations to localStorage
const saveConversations = (conversations: Conversation[]): void => {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
};

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Get messages from local storage
      const messages = getOfflineMessages();
      const contacts = getSavedContacts();
      
      // Group messages by conversation
      const conversationMap = new Map<string, {
        participantId: string;
        messages: typeof messages;
      }>();
      
      messages.forEach(msg => {
        if (!conversationMap.has(msg.conversationId)) {
          // Determine participant (the other person)
          const participantId = msg.senderId === user.id ? msg.recipientId : msg.senderId;
          conversationMap.set(msg.conversationId, {
            participantId,
            messages: []
          });
        }
        conversationMap.get(msg.conversationId)!.messages.push(msg);
      });
      
      // Build conversation list from local data
      const conversationList: Conversation[] = [];
      
      conversationMap.forEach((data, convId) => {
        // Find contact info
        const contact = contacts.find(c => c.userId === data.participantId);
        
        // Sort messages by date
        data.messages.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        const lastMsg = data.messages[0];
        const unreadCount = data.messages.filter(m => 
          m.senderId !== user.id && !m.synced
        ).length;
        
        conversationList.push({
          id: convId,
          participantId: data.participantId || '',
          participantName: contact?.displayName || 'Utilisateur',
          participantUsername: contact?.username || 'inconnu',
          participantAvatar: contact?.avatarUrl,
          isOnline: false, // Will be determined by Bluetooth proximity
          lastMessage: lastMsg?.content,
          lastMessageTime: lastMsg?.createdAt,
          unreadCount,
        });
      });
      
      // Also load stored conversations that might not have messages yet
      const storedConvs = getStoredConversations();
      storedConvs.forEach(stored => {
        if (!conversationList.some(c => c.id === stored.id)) {
          conversationList.push(stored);
        }
      });

      // Sort by last message time
      conversationList.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setConversations(conversationList);
      saveConversations(conversationList);
    } catch (error) {
      console.error('[Conversations] Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check if conversation already exists
      const existing = conversations.find(c => c.participantId === otherUserId);
      if (existing) {
        return existing.id;
      }
      
      // Create new conversation locally
      const conversationId = crypto.randomUUID();
      const contacts = getSavedContacts();
      const contact = contacts.find(c => c.userId === otherUserId);
      
      const newConversation: Conversation = {
        id: conversationId,
        participantId: otherUserId,
        participantName: contact?.displayName || 'Utilisateur',
        participantUsername: contact?.username || 'inconnu',
        participantAvatar: contact?.avatarUrl,
        isOnline: false,
        unreadCount: 0,
      };
      
      const updatedConversations = [newConversation, ...conversations];
      setConversations(updatedConversations);
      saveConversations(updatedConversations);
      
      return conversationId;
    } catch (error) {
      console.error('[Conversations] Erreur création:', error);
      return null;
    }
  };

  // Fetch on mount and periodically refresh
  useEffect(() => {
    fetchConversations();
    
    // Refresh every 3 seconds to pick up new messages
    const interval = setInterval(fetchConversations, 3000);
    
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return { conversations, loading, fetchConversations, createConversation };
};
