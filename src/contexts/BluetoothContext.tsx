import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  getMeshManager, 
  stopMeshManager, 
  MeshNetworkManager
} from '@/services/BluetoothMeshService';
import { saveContactLocally, getSavedContacts, SavedContact } from '@/services/OfflineMessageService';

interface BluetoothDevice {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  signalStrength: number;
  isNearby: boolean;
}

interface BluetoothContextType {
  isBluetoothEnabled: boolean;
  isScanning: boolean;
  nearbyDevices: BluetoothDevice[];
  savedContacts: SavedContact[];
  enableBluetooth: () => Promise<void>;
  disableBluetooth: () => void;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  isUserNearby: (userId: string) => boolean;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState<BluetoothDevice[]>([]);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const meshManagerRef = useRef<MeshNetworkManager | null>(null);
  const autoScanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved contacts on mount
  useEffect(() => {
    setSavedContacts(getSavedContacts());
  }, []);

  // Auto-enable Bluetooth and start scanning when user is authenticated
  useEffect(() => {
    if (user) {
      const initBluetooth = async () => {
        try {
          meshManagerRef.current = getMeshManager(user.id);
          await meshManagerRef.current.start();
          setIsBluetoothEnabled(true);
          
          // Initial scan
          await performScan();

          // Auto-scan every 15 seconds
          autoScanIntervalRef.current = setInterval(performScan, 15000);
        } catch (error) {
          console.error('[Bluetooth] Erreur initialisation:', error);
        }
      };

      const performScan = async () => {
        if (!meshManagerRef.current) return;
        
        setIsScanning(true);
        try {
          const devices = await meshManagerRef.current.scanForDevices();
          await enrichDevicesWithProfiles(devices);
        } finally {
          setIsScanning(false);
        }
      };

      initBluetooth();

      return () => {
        if (autoScanIntervalRef.current) {
          clearInterval(autoScanIntervalRef.current);
        }
      };
    }
  }, [user]);

  // Enrich devices with profile information
  const enrichDevicesWithProfiles = async (devices: { id: string; name: string; userId: string; signalStrength: number; isNearby: boolean }[]) => {
    if (devices.length === 0) {
      return;
    }

    try {
      const userIds = devices.map(d => d.userId);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;

      const enrichedDevices: BluetoothDevice[] = devices.map(device => {
        const profile = profiles?.find(p => p.user_id === device.userId);
        
        const enriched: BluetoothDevice = {
          id: device.id,
          userId: device.userId,
          username: profile?.username || 'inconnu',
          displayName: profile?.display_name || profile?.username || 'Utilisateur',
          avatarUrl: profile?.avatar_url || undefined,
          signalStrength: device.signalStrength,
          isNearby: device.isNearby,
        };

        // Save contact locally for offline access
        saveContactLocally({
          userId: enriched.userId,
          username: enriched.username,
          displayName: enriched.displayName,
          avatarUrl: enriched.avatarUrl,
          lastSeen: new Date().toISOString(),
        });

        return enriched;
      });

      setNearbyDevices(enrichedDevices);
      setSavedContacts(getSavedContacts());
    } catch (error) {
      console.error('[Bluetooth] Erreur enrichissement profils:', error);
    }
  };

  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline, 
          last_seen: new Date().toISOString() 
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }, [user]);

  const enableBluetooth = async () => {
    try {
      setIsBluetoothEnabled(true);
      await updateOnlineStatus(true);
      
      if (user) {
        meshManagerRef.current = getMeshManager(user.id);
        await meshManagerRef.current.start();
        
        // Start auto-scanning
        const performScan = async () => {
          if (!meshManagerRef.current) return;
          setIsScanning(true);
          try {
            const devices = await meshManagerRef.current.scanForDevices();
            await enrichDevicesWithProfiles(devices);
          } finally {
            setIsScanning(false);
          }
        };

        await performScan();
        
        if (!autoScanIntervalRef.current) {
          autoScanIntervalRef.current = setInterval(performScan, 15000);
        }
      }
      
      toast({
        title: "Bluetooth activé",
        description: "Recherche automatique des appareils activée.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'activer le Bluetooth.",
        variant: "destructive",
      });
    }
  };

  const disableBluetooth = async () => {
    if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
    }
    
    setIsBluetoothEnabled(false);
    setIsScanning(false);
    setNearbyDevices([]);
    await updateOnlineStatus(false);
    await stopMeshManager();
    meshManagerRef.current = null;
    
    toast({
      title: "Bluetooth désactivé",
      description: "Vous n'êtes plus visible.",
    });
  };

  const startScanning = async () => {
    if (!user) return;

    setIsScanning(true);
    
    try {
      if (!meshManagerRef.current) {
        meshManagerRef.current = getMeshManager(user.id);
        await meshManagerRef.current.start();
        setIsBluetoothEnabled(true);
      }
      
      const discoveredDevices = await meshManagerRef.current.scanForDevices();
      await enrichDevicesWithProfiles(discoveredDevices);
    } catch (error) {
      console.error('Erreur lors du scan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const isUserNearby = (userId: string): boolean => {
    if (meshManagerRef.current) {
      return meshManagerRef.current.isUserNearby(userId);
    }
    return nearbyDevices.some(d => d.userId === userId && d.isNearby);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
      }
      stopMeshManager();
    };
  }, []);

  return (
    <BluetoothContext.Provider
      value={{
        isBluetoothEnabled,
        isScanning,
        nearbyDevices,
        savedContacts,
        enableBluetooth,
        disableBluetooth,
        startScanning,
        stopScanning,
        isUserNearby,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = () => {
  const context = useContext(BluetoothContext);
  if (context === undefined) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
};
