import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

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
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState<BluetoothDevice[]>([]);

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
      // Check if Web Bluetooth API is available
      if ('bluetooth' in navigator) {
        setIsBluetoothEnabled(true);
        await updateOnlineStatus(true);
        toast({
          title: "Bluetooth activé",
          description: "Vous êtes maintenant visible pour les autres utilisateurs à proximité.",
        });
      } else {
        // Fallback for browsers without Web Bluetooth
        setIsBluetoothEnabled(true);
        await updateOnlineStatus(true);
        toast({
          title: "Mode en ligne activé",
          description: "Vous êtes maintenant visible pour les autres utilisateurs.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'activer le Bluetooth. Vérifiez vos paramètres.",
        variant: "destructive",
      });
    }
  };

  const disableBluetooth = () => {
    setIsBluetoothEnabled(false);
    setIsScanning(false);
    setNearbyDevices([]);
    updateOnlineStatus(false);
    toast({
      title: "Bluetooth désactivé",
      description: "Vous n'êtes plus visible pour les autres utilisateurs.",
    });
  };

  const startScanning = async () => {
    if (!isBluetoothEnabled || !user) return;

    setIsScanning(true);
    
    try {
      // Fetch online users from database (simulating Bluetooth discovery)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_online', true)
        .neq('user_id', user.id);

      if (error) throw error;

      const devices: BluetoothDevice[] = (profiles || []).map((profile) => ({
        id: profile.bluetooth_id || profile.id,
        userId: profile.user_id,
        username: profile.username,
        displayName: profile.display_name || profile.username,
        avatarUrl: profile.avatar_url,
        signalStrength: Math.floor(Math.random() * 100) + 1,
        isNearby: Math.random() > 0.3,
      }));

      setNearbyDevices(devices);

      // Log discoveries
      for (const device of devices) {
        await supabase.from('device_discoveries').insert({
          discoverer_id: user.id,
          discovered_user_id: device.userId,
          bluetooth_signal_strength: device.signalStrength,
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
