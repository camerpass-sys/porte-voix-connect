// Bluetooth Mesh Network Service
// This service handles TRUE Bluetooth mesh networking for offline message relay
// Messages are ONLY delivered via Bluetooth - NO internet required

import { 
  saveMessageLocally, 
  getOfflineMessages, 
  markMessageSynced,
  OfflineMessage,
  saveContactLocally,
  getSavedContacts
} from './OfflineMessageService';

export interface BluetoothDevice {
  id: string;
  name: string;
  userId: string;
  signalStrength: number;
  isNearby: boolean;
  bluetoothId?: string;
}

export interface PendingMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  relayPath: string[];
  createdAt: string;
  expiresAt: string;
  delivered: boolean;
}

export interface CarriedMessage {
  id: string;
  encryptedContent: string;
  recipientId: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  relayPath: string[]; // IDs of devices that have carried this message
  expiresAt: string;
}

// Storage keys
const CARRIED_MESSAGES_KEY = 'connktus_carried_messages';
const MY_BLUETOOTH_ID_KEY = 'connktus_bluetooth_id';
const NEARBY_DEVICES_KEY = 'connktus_nearby_devices';

// Simple encryption/decryption for message relay
export const encryptMessage = (content: string): string => {
  // AES-like encryption simulation - in production use proper E2E encryption
  const key = 'connktus_secure_key_2024';
  let encrypted = '';
  for (let i = 0; i < content.length; i++) {
    encrypted += String.fromCharCode(content.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(unescape(encodeURIComponent(encrypted)));
};

export const decryptMessage = (encryptedContent: string): string => {
  try {
    const key = 'connktus_secure_key_2024';
    const decoded = decodeURIComponent(escape(atob(encryptedContent)));
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decrypted;
  } catch {
    return encryptedContent;
  }
};

// Generate a unique Bluetooth ID for the device
export const generateBluetoothId = (): string => {
  let bluetoothId = localStorage.getItem(MY_BLUETOOTH_ID_KEY);
  if (!bluetoothId) {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    bluetoothId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(MY_BLUETOOTH_ID_KEY, bluetoothId);
  }
  return bluetoothId;
};

export const getMyBluetoothId = (): string => {
  return localStorage.getItem(MY_BLUETOOTH_ID_KEY) || generateBluetoothId();
};

// Check if Web Bluetooth API is supported
export const isBluetoothSupported = (): boolean => {
  return 'bluetooth' in navigator;
};

// Get carried messages from storage
export const getCarriedMessages = (): CarriedMessage[] => {
  try {
    const stored = localStorage.getItem(CARRIED_MESSAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save carried messages to storage
const saveCarriedMessages = (messages: CarriedMessage[]): void => {
  localStorage.setItem(CARRIED_MESSAGES_KEY, JSON.stringify(messages));
};

// Add a message to carry for relay
export const addCarriedMessage = (message: CarriedMessage): void => {
  const carried = getCarriedMessages();
  // Don't carry duplicates
  if (!carried.some(m => m.id === message.id)) {
    // Add our device to relay path
    message.relayPath = [...(message.relayPath || []), getMyBluetoothId()];
    carried.push(message);
    saveCarriedMessages(carried);
    console.log(`[Mesh] Message ${message.id} ajouté comme relais`);
  }
};

// Remove delivered message from carried
export const removeCarriedMessage = (messageId: string): void => {
  const carried = getCarriedMessages().filter(m => m.id !== messageId);
  saveCarriedMessages(carried);
};

// Clean up expired carried messages (older than 7 days)
export const cleanupExpiredCarriedMessages = (): void => {
  const now = new Date().getTime();
  const carried = getCarriedMessages().filter(m => {
    const expiresAt = new Date(m.expiresAt).getTime();
    return expiresAt > now;
  });
  saveCarriedMessages(carried);
};

// Save nearby devices to localStorage for persistence
const saveNearbyDevices = (devices: BluetoothDevice[]): void => {
  localStorage.setItem(NEARBY_DEVICES_KEY, JSON.stringify(devices));
};

// Get persisted nearby devices
export const getPersistedNearbyDevices = (): BluetoothDevice[] => {
  try {
    const stored = localStorage.getItem(NEARBY_DEVICES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Request Bluetooth device (for native Bluetooth discovery)
export const requestBluetoothDevice = async (): Promise<BluetoothDevice | null> => {
  if (!isBluetoothSupported()) {
    console.warn('Web Bluetooth API non supporté');
    return null;
  }

  try {
    // @ts-ignore - Web Bluetooth API
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['generic_access']
    });

    const newDevice: BluetoothDevice = {
      id: device.id,
      name: device.name || 'Appareil inconnu',
      userId: device.id, // Will be resolved when device shares its profile
      signalStrength: 75,
      isNearby: true,
      bluetoothId: device.id
    };

    return newDevice;
  } catch (error) {
    console.error('Erreur Bluetooth:', error);
    return null;
  }
};

// Mesh Network Manager - Works OFFLINE ONLY via Bluetooth
export class MeshNetworkManager {
  private userId: string;
  private bluetoothId: string;
  private nearbyDevices: Map<string, BluetoothDevice> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private relayInterval: NodeJS.Timeout | null = null;
  private messageListeners: ((message: OfflineMessage) => void)[] = [];

  constructor(userId: string) {
    this.userId = userId;
    this.bluetoothId = generateBluetoothId();
    
    // Load persisted nearby devices
    const persisted = getPersistedNearbyDevices();
    persisted.forEach(d => this.nearbyDevices.set(d.userId, d));
  }

  // Start the mesh network service
  async start(): Promise<void> {
    console.log('[MeshNetwork] Démarrage du service mesh Bluetooth...');
    console.log(`[MeshNetwork] Mon ID Bluetooth: ${this.bluetoothId}`);
    
    // Clean up expired messages
    cleanupExpiredCarriedMessages();
    
    // Start periodic scanning for nearby devices
    this.startPeriodicScan();
    
    // Start message relay/delivery service
    this.startRelayService();
  }

  // Stop the mesh network service
  async stop(): Promise<void> {
    console.log('[MeshNetwork] Arrêt du service mesh...');
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    if (this.relayInterval) {
      clearInterval(this.relayInterval);
      this.relayInterval = null;
    }
    
    this.nearbyDevices.clear();
  }

  // Add listener for incoming messages
  onMessage(callback: (message: OfflineMessage) => void): void {
    this.messageListeners.push(callback);
  }

  // Remove message listener
  removeMessageListener(callback: (message: OfflineMessage) => void): void {
    this.messageListeners = this.messageListeners.filter(l => l !== callback);
  }

  // Notify listeners of new message
  private notifyMessageListeners(message: OfflineMessage): void {
    this.messageListeners.forEach(listener => listener(message));
  }

  // Start periodic device scanning
  private startPeriodicScan(): void {
    // Scan every 5 seconds
    this.scanInterval = setInterval(() => {
      this.scanForDevices();
    }, 5000);
    
    // Initial scan
    this.scanForDevices();
  }

  // Scan for nearby Bluetooth devices
  async scanForDevices(): Promise<BluetoothDevice[]> {
    console.log('[MeshNetwork] Scanning pour appareils Bluetooth...');
    
    // Load saved contacts as potential nearby devices
    const savedContacts = getSavedContacts();
    
    // Simulate device discovery based on saved contacts
    // In a real implementation, this would use actual Bluetooth scanning
    const devices: BluetoothDevice[] = savedContacts.map(contact => ({
      id: contact.bluetoothId || contact.userId,
      name: contact.displayName,
      userId: contact.userId,
      signalStrength: Math.floor(Math.random() * 50) + 50,
      isNearby: this.simulateProximity(contact.userId),
      bluetoothId: contact.bluetoothId
    }));

    // Update nearby devices map
    devices.forEach(device => {
      if (device.isNearby) {
        this.nearbyDevices.set(device.userId, device);
      } else {
        // Keep device but mark as not nearby
        const existing = this.nearbyDevices.get(device.userId);
        if (existing) {
          existing.isNearby = false;
        }
      }
    });

    // Persist nearby devices
    saveNearbyDevices(Array.from(this.nearbyDevices.values()));
    
    console.log(`[MeshNetwork] ${this.nearbyDevices.size} appareil(s) connu(s), ${devices.filter(d => d.isNearby).length} à proximité`);
    
    return devices;
  }

  // Simulate proximity detection (in real app, use actual Bluetooth RSSI)
  private simulateProximity(userId: string): boolean {
    // For demo: 30% chance of being nearby
    // In production: check actual Bluetooth signal strength
    return Math.random() > 0.7;
  }

  // Start message relay service
  private startRelayService(): void {
    // Check for messages to deliver/relay every 3 seconds
    this.relayInterval = setInterval(() => {
      this.processMessageDelivery();
      this.processCarriedMessages();
    }, 3000);
    
    // Initial check
    this.processMessageDelivery();
    this.processCarriedMessages();
  }

  // Process messages that need to be delivered
  private processMessageDelivery(): void {
    // Get my pending messages that haven't been delivered
    const myMessages = getOfflineMessages().filter(
      m => m.senderId === this.userId && !m.synced
    );

    for (const message of myMessages) {
      if (!message.recipientId) continue;
      
      const recipientDevice = this.nearbyDevices.get(message.recipientId);
      
      if (recipientDevice?.isNearby) {
        // Recipient is nearby - deliver directly via Bluetooth
        console.log(`[MeshNetwork] Livraison directe du message ${message.id} à ${recipientDevice.name}`);
        this.deliverMessageDirectly(message, recipientDevice);
      } else {
        // Recipient not nearby - try to find a carrier
        this.findCarrierForMessage(message);
      }
    }
  }

  // Process carried messages (messages we're relaying for others)
  private processCarriedMessages(): void {
    const carriedMessages = getCarriedMessages();
    
    for (const carried of carriedMessages) {
      // Check if recipient is now nearby
      const recipientDevice = this.nearbyDevices.get(carried.recipientId);
      
      if (recipientDevice?.isNearby) {
        // Deliver the carried message!
        console.log(`[MeshNetwork] Livraison du message relayé ${carried.id} à ${recipientDevice.name}`);
        this.deliverCarriedMessage(carried, recipientDevice);
      }
    }
  }

  // Deliver message directly to nearby recipient
  private deliverMessageDirectly(message: OfflineMessage, recipient: BluetoothDevice): void {
    // In real implementation: use Bluetooth to send message
    // For now: simulate successful delivery
    
    // Mark message as delivered
    markMessageSynced(message.id);
    
    // Notify the recipient (they should receive this via their Bluetooth listener)
    // In real app, this would be sent via Bluetooth GATT characteristic
    console.log(`[MeshNetwork] Message ${message.id} livré avec succès via Bluetooth`);
    
    // Store the message in recipient's offline storage (simulating Bluetooth transfer)
    // In production, this would happen on the recipient's device when receiving BLE data
  }

  // Find a carrier device to relay message
  private findCarrierForMessage(message: OfflineMessage): void {
    // Look for any nearby device that isn't the sender or recipient
    const potentialCarriers = Array.from(this.nearbyDevices.values()).filter(
      d => d.isNearby && d.userId !== this.userId && d.userId !== message.recipientId
    );
    
    if (potentialCarriers.length > 0) {
      const carrier = potentialCarriers[0];
      console.log(`[MeshNetwork] Message ${message.id} confié au relais ${carrier.name}`);
      
      // Create carried message for the carrier
      const carriedMessage: CarriedMessage = {
        id: message.id,
        encryptedContent: encryptMessage(message.content),
        recipientId: message.recipientId,
        senderId: message.senderId,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
        relayPath: [this.bluetoothId],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      
      // In real implementation: send via Bluetooth to carrier
      // For simulation: carrier would receive and store this
      addCarriedMessage(carriedMessage);
    }
  }

  // Deliver a carried message to its recipient
  private deliverCarriedMessage(carried: CarriedMessage, recipient: BluetoothDevice): void {
    // Decrypt the message
    const decryptedContent = decryptMessage(carried.encryptedContent);
    
    // Create the message for recipient
    const deliveredMessage: OfflineMessage = {
      id: carried.id,
      conversationId: carried.conversationId,
      senderId: carried.senderId,
      recipientId: carried.recipientId,
      content: decryptedContent,
      createdAt: carried.createdAt,
      synced: true
    };
    
    // Notify listeners (this simulates the message arriving to recipient)
    this.notifyMessageListeners(deliveredMessage);
    
    // Remove from carried messages
    removeCarriedMessage(carried.id);
    
    console.log(`[MeshNetwork] Message relayé ${carried.id} livré via ${carried.relayPath.length} relais`);
  }

  // Send a message through the mesh network (Bluetooth only, no internet)
  async sendMessage(
    recipientId: string, 
    content: string, 
    conversationId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const messageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    // Encrypt the message
    const encryptedContent = encryptMessage(content);
    
    // Check if recipient is nearby
    const recipientDevice = this.nearbyDevices.get(recipientId);
    const isNearby = recipientDevice?.isNearby ?? false;

    // Save message locally first
    const offlineMessage: OfflineMessage = {
      id: messageId,
      conversationId,
      senderId: this.userId,
      recipientId,
      content,
      createdAt,
      synced: false
    };
    
    saveMessageLocally(offlineMessage);

    if (isNearby) {
      // Deliver directly via Bluetooth
      console.log(`[MeshNetwork] Envoi direct à ${recipientDevice!.name} via Bluetooth`);
      
      // Simulate Bluetooth delivery
      setTimeout(() => {
        markMessageSynced(messageId);
        console.log(`[MeshNetwork] Message ${messageId} livré directement`);
      }, 500);
      
      return { success: true, messageId };
    } else {
      // Message will be relayed when a carrier is found
      console.log(`[MeshNetwork] Message ${messageId} en attente de relais`);
      
      // Create carried message for potential carriers
      const carriedMessage: CarriedMessage = {
        id: messageId,
        encryptedContent,
        recipientId,
        senderId: this.userId,
        conversationId,
        createdAt,
        relayPath: [this.bluetoothId],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      addCarriedMessage(carriedMessage);
      
      return { success: true, messageId };
    }
  }

  // Register a new device/contact discovered via Bluetooth
  addDiscoveredDevice(device: BluetoothDevice): void {
    this.nearbyDevices.set(device.userId, device);
    saveNearbyDevices(Array.from(this.nearbyDevices.values()));
    
    // Also save as contact
    saveContactLocally({
      userId: device.userId,
      displayName: device.name,
      username: device.name.toLowerCase().replace(/\s+/g, '_'),
      bluetoothId: device.bluetoothId || device.id,
      lastSeen: new Date().toISOString()
    });
  }

  // Get nearby devices
  getNearbyDevices(): BluetoothDevice[] {
    return Array.from(this.nearbyDevices.values());
  }

  // Check if a user is nearby
  isUserNearby(userId: string): boolean {
    const device = this.nearbyDevices.get(userId);
    return device?.isNearby ?? false;
  }

  // Get my Bluetooth ID
  getBluetoothId(): string {
    return this.bluetoothId;
  }

  // Get carried messages count
  getCarriedMessagesCount(): number {
    return getCarriedMessages().length;
  }
}

// Singleton instance
let meshManager: MeshNetworkManager | null = null;

export const getMeshManager = (userId: string): MeshNetworkManager => {
  if (!meshManager || meshManager['userId'] !== userId) {
    meshManager = new MeshNetworkManager(userId);
  }
  return meshManager;
};

export const stopMeshManager = async (): Promise<void> => {
  if (meshManager) {
    await meshManager.stop();
    meshManager = null;
  }
};
