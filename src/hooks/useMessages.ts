import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  saveMessageLocally, 
  getOfflineMessages, 
  markMessageSynced,
  OfflineMessage 
} from '@/services/OfflineMessageService';
import { 
  getMeshManager, 
  encryptMessage,
  decryptMessage 
} from '@/services/BluetoothMeshService';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  status: 'pending' | 'sent' | 'delivered' | 'seen';
  createdAt: string;
  deliveredAt?: string;
  seenAt?: string;
  isMine: boolean;
  relayPath?: string[];
}

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch messages from local storage (Bluetooth-only, no internet)
  const fetchMessages = useCallback(() => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      // Get all messages for this conversation from local storage
      const offlineMessages = getOfflineMessages()
        .filter(m => m.conversationId === conversationId)
        .map(m => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          status: (m.synced ? 'delivered' : 'pending') as Message['status'],
          createdAt: m.createdAt,
          isMine: m.senderId === user.id,
        }))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setMessages(offlineMessages);
    } catch (error) {
      console.error('[Messages] Erreur chargement:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  // Send message via Bluetooth mesh (no internet)
  const sendMessage = async (content: string): Promise<boolean> => {
    if (!conversationId || !user || !content.trim()) return false;

    const messageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Add message to local state immediately
    const newMessage: Message = {
      id: messageId,
      content: content.trim(),
      senderId: user.id,
      status: 'pending',
      createdAt,
      isMine: true,
    };

    setMessages(prev => [...prev, newMessage]);

    // Get mesh manager
    const meshManager = getMeshManager(user.id);
    
    // Save message locally
    const offlineMessage: OfflineMessage = {
      id: messageId,
      conversationId,
      senderId: user.id,
      recipientId: '', // Will be determined by mesh network
      content: content.trim(),
      createdAt,
      synced: false
    };
    
    saveMessageLocally(offlineMessage);

    // Message will be delivered when recipient is nearby or via carrier
    console.log(`[Messages] Message ${messageId} en attente de livraison Bluetooth`);
    
    return true;
  };

  // Listen for incoming messages via Bluetooth mesh
  useEffect(() => {
    if (!user) return;

    const meshManager = getMeshManager(user.id);
    
    // Handle incoming message from mesh
    const handleIncomingMessage = (message: OfflineMessage) => {
      if (message.conversationId === conversationId) {
        const newMessage: Message = {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          status: 'delivered',
          createdAt: message.createdAt,
          isMine: message.senderId === user.id,
        };
        
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, newMessage].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    };

    meshManager.onMessage(handleIncomingMessage);

    return () => {
      meshManager.removeMessageListener(handleIncomingMessage);
    };
  }, [conversationId, user]);

  // Fetch messages on mount and when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Periodically check for message delivery updates
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      // Refresh messages from local storage to get updated statuses
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  return { messages, loading, sendMessage, fetchMessages };
};
