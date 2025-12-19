// Bluetooth Mesh Network Service
// This service handles the mesh networking logic for message relay

import { supabase } from '@/integrations/supabase/client';

export interface BluetoothDevice {
  id: string;
  name: string;
  userId: string;
  signalStrength: number;
  isNearby: boolean;
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
}

// Simple encryption/decryption for message relay (in production, use proper E2E encryption)
export const encryptMessage = (content: string, recipientPublicKey?: string): string => {
  // Base64 encode for simplicity - in production, use proper asymmetric encryption
  return btoa(unescape(encodeURIComponent(content)));
};

export const decryptMessage = (encryptedContent: string, privateKey?: string): string => {
  try {
    return decodeURIComponent(escape(atob(encryptedContent)));
  } catch {
    return encryptedContent;
  }
};

// Generate a unique Bluetooth ID for the device
export const generateBluetoothId = (): string => {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Check if Web Bluetooth API is supported
export const isBluetoothSupported = (): boolean => {
  return 'bluetooth' in navigator;
};

// Request Bluetooth device (for native Bluetooth discovery)
export const requestBluetoothDevice = async (): Promise<BluetoothDevice | null> => {
  if (!isBluetoothSupported()) {
    console.warn('Web Bluetooth API non supporté sur ce navigateur');
    return null;
  }

  try {
    // @ts-ignore - Web Bluetooth API
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['generic_access']
    });

    return {
      id: device.id,
      name: device.name || 'Appareil inconnu',
      userId: '',
      signalStrength: 75,
      isNearby: true
    };
  } catch (error) {
    console.error('Erreur Bluetooth:', error);
    return null;
  }
};

// Mesh Network Manager
export class MeshNetworkManager {
  private userId: string;
  private nearbyDevices: Map<string, BluetoothDevice> = new Map();
  private pendingMessages: PendingMessage[] = [];
  private scanInterval: NodeJS.Timeout | null = null;
  private relayInterval: NodeJS.Timeout | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Start the mesh network service
  async start(): Promise<void> {
    console.log('[MeshNetwork] Démarrage du service mesh...');
    
    // Update online status
    await this.updateOnlineStatus(true);
    
    // Start periodic scanning
    this.startPeriodicScan();
    
    // Start message relay service
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
    
    await this.updateOnlineStatus(false);
    this.nearbyDevices.clear();
  }

  // Update user online status
  private async updateOnlineStatus(isOnline: boolean): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline, 
          last_seen: new Date().toISOString() 
        })
        .eq('user_id', this.userId);
    } catch (error) {
      console.error('[MeshNetwork] Erreur mise à jour statut:', error);
    }
  }

  // Start periodic device scanning
  private startPeriodicScan(): void {
    this.scanInterval = setInterval(async () => {
      await this.scanForDevices();
    }, 10000); // Scan every 10 seconds
    
    // Initial scan
    this.scanForDevices();
  }

  // Scan for nearby devices
  async scanForDevices(): Promise<BluetoothDevice[]> {
    try {
      // Get online users from database
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_online', true)
        .neq('user_id', this.userId);

      if (error) throw error;

      const devices: BluetoothDevice[] = (profiles || []).map((profile) => ({
        id: profile.bluetooth_id || profile.id,
        name: profile.display_name || profile.username,
        userId: profile.user_id,
        signalStrength: Math.floor(Math.random() * 50) + 50, // Simulated signal strength
        isNearby: Math.random() > 0.3 // Simulated proximity
      }));

      // Update nearby devices map
      this.nearbyDevices.clear();
      devices.forEach(device => {
        this.nearbyDevices.set(device.userId, device);
      });

      // Log discoveries
      for (const device of devices) {
        await supabase.from('device_discoveries').insert({
          discoverer_id: this.userId,
          discovered_user_id: device.userId,
          bluetooth_signal_strength: device.signalStrength,
        });
      }

      console.log(`[MeshNetwork] ${devices.length} appareil(s) détecté(s)`);
      return devices;
    } catch (error) {
      console.error('[MeshNetwork] Erreur scan:', error);
      return [];
    }
  }

  // Start message relay service
  private startRelayService(): void {
    this.relayInterval = setInterval(async () => {
      await this.processRelayMessages();
    }, 5000); // Check for relay messages every 5 seconds
  }

  // Process messages that need to be relayed
  private async processRelayMessages(): Promise<void> {
    try {
      // Get pending messages that need to be delivered
      const { data: pendingMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('status', 'pending')
        .not('sender_id', 'eq', this.userId);

      if (error) throw error;

      for (const message of pendingMessages || []) {
        // Check if recipient is nearby
        const recipientDevice = this.nearbyDevices.get(message.sender_id);
        
        if (recipientDevice && recipientDevice.isNearby) {
          // Deliver message directly
          await supabase
            .from('messages')
            .update({ 
              status: 'delivered',
              delivered_at: new Date().toISOString()
            })
            .eq('id', message.id);
          
          console.log(`[MeshNetwork] Message ${message.id} livré directement`);
        }
      }
    } catch (error) {
      console.error('[MeshNetwork] Erreur relay:', error);
    }
  }

  // Send a message through the mesh network
  async sendMessage(
    recipientId: string, 
    content: string, 
    conversationId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const recipientDevice = this.nearbyDevices.get(recipientId);
      const isNearby = recipientDevice?.isNearby ?? false;

      // Encrypt message content
      const encryptedContent = encryptMessage(content);

      // Determine initial status
      const status = isNearby ? 'sent' : 'pending';

      // Insert message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: this.userId,
          content: content,
          encrypted_content: encryptedContent,
          status: status,
          relay_path: isNearby ? [] : [this.userId]
        })
        .select()
        .single();

      if (error) throw error;

      // If nearby, simulate immediate delivery
      if (isNearby) {
        setTimeout(async () => {
          await supabase
            .from('messages')
            .update({ 
              status: 'delivered',
              delivered_at: new Date().toISOString()
            })
            .eq('id', data.id);
        }, 1000 + Math.random() * 2000);
      }

      console.log(`[MeshNetwork] Message envoyé: ${data.id}, statut: ${status}`);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('[MeshNetwork] Erreur envoi:', error);
      return { success: false, error: 'Erreur lors de l\'envoi du message' };
    }
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
