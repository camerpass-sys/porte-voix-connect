// Offline Message Service - Handles message storage and sync for offline functionality

export interface OfflineMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  synced: boolean;
}

const STORAGE_KEY = 'connktus_offline_messages';
const CONTACTS_KEY = 'connktus_contacts';

// Get offline messages from local storage
export const getOfflineMessages = (): OfflineMessage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save a message locally for offline support
export const saveMessageLocally = (message: OfflineMessage): void => {
  try {
    const messages = getOfflineMessages();
    messages.push(message);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('[Offline] Erreur sauvegarde message:', error);
  }
};

// Mark message as synced
export const markMessageSynced = (messageId: string): void => {
  try {
    const messages = getOfflineMessages();
    const updated = messages.map(m => 
      m.id === messageId ? { ...m, synced: true } : m
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[Offline] Erreur mise à jour message:', error);
  }
};

// Get unsynced messages
export const getUnsyncedMessages = (): OfflineMessage[] => {
  return getOfflineMessages().filter(m => !m.synced);
};

// Remove synced messages older than 7 days
export const cleanupOldMessages = (): void => {
  try {
    const messages = getOfflineMessages();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = messages.filter(m => 
      !m.synced || new Date(m.createdAt).getTime() > sevenDaysAgo
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[Offline] Erreur nettoyage:', error);
  }
};

// Contact storage
export interface SavedContact {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  lastSeen: string;
  bluetoothId?: string;
}

// Get saved contacts
export const getSavedContacts = (): SavedContact[] => {
  try {
    const stored = localStorage.getItem(CONTACTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save a contact locally
export const saveContactLocally = (contact: SavedContact): void => {
  try {
    const contacts = getSavedContacts();
    const existingIndex = contacts.findIndex(c => c.userId === contact.userId);
    
    if (existingIndex >= 0) {
      contacts[existingIndex] = { ...contacts[existingIndex], ...contact, lastSeen: new Date().toISOString() };
    } else {
      contacts.push({ ...contact, lastSeen: new Date().toISOString() });
    }
    
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch (error) {
    console.error('[Offline] Erreur sauvegarde contact:', error);
  }
};

// Remove a contact
export const removeContact = (userId: string): void => {
  try {
    const contacts = getSavedContacts().filter(c => c.userId !== userId);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch (error) {
    console.error('[Offline] Erreur suppression contact:', error);
  }
};

// Check if online
export const isOnline = (): boolean => {
  return navigator.onLine;
};
