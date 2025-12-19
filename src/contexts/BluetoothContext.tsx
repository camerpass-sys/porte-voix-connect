import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  getMeshManager, 
  stopMeshManager, 
  MeshNetworkManager,
  BluetoothDevice as MeshDevice 
} from '@/services/BluetoothMeshService';

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
  const [meshManager, setMeshManager] = useState<MeshNetworkManager | null>(null);

  // Initialize mesh manager when user logs in
  useEffect(() => {
    if (user && isBluetoothEnabled) {
      const manager = getMeshManager(user.id);
      manager.start();
      setMeshManager(manager);
    }

    return () => {
      if (isBluetoothEnabled) {
        stopMeshManager();
      }
    };
  }, [user, isBluetoothEnabled]);

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
        const manager = getMeshManager(user.id);
        await manager.start();
        setMeshManager(manager);
      }
      
      toast({
        title: "Bluetooth activé",
        description: "Vous êtes maintenant visible pour les autres utilisateurs à proximité.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'activer le Bluetooth. Vérifiez vos paramètres.",
        variant: "destructive",
      });
    }
  };

  const disableBluetooth = async () => {
    setIsBluetoothEnabled(false);
    setIsScanning(false);
    setNearbyDevices([]);
    await updateOnlineStatus(false);
    await stopMeshManager();
    setMeshManager(null);
    
    toast({
      title: "Bluetooth désactivé",
      description: "Vous n'êtes plus visible pour les autres utilisateurs.",
    });
  };

  const startScanning = async () => {
    if (!isBluetoothEnabled || !user) return;

    setIsScanning(true);
    
    try {
      // Use mesh manager to scan
      const manager = meshManager || getMeshManager(user.id);
      const discoveredDevices = await manager.scanForDevices();

      // Enrich with profile data
      const enrichedDevices: BluetoothDevice[] = [];
      
      for (const device of discoveredDevices) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', device.userId)
          .maybeSingle();

        if (profile) {
          enrichedDevices.push({
            id: device.id,
            userId: device.userId,
            username: profile.username,
            displayName: profile.display_name || profile.username,
            avatarUrl: profile.avatar_url,
            signalStrength: device.signalStrength,
            isNearby: device.isNearby,
          });
        }
      }

      setNearbyDevices(enrichedDevices);
      
      if (enrichedDevices.length > 0) {
        toast({
          title: "Scan terminé",
          description: `${enrichedDevices.length} appareil(s) trouvé(s) à proximité.`,
        });
      }
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      toast({
        title: "Erreur de scan",
        description: "Impossible de rechercher les appareils à proximité.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const isUserNearby = (userId: string): boolean => {
    if (meshManager) {
      return meshManager.isUserNearby(userId);
    }
    return nearbyDevices.some(d => d.userId === userId && d.isNearby);
  };

  return (
    <BluetoothContext.Provider
      value={{
        isBluetoothEnabled,
        isScanning,
        nearbyDevices,
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
