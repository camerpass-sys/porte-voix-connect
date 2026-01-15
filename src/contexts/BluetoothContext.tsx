import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  getMeshManager, 
  stopMeshManager, 
  MeshNetworkManager,
  getPersistedNearbyDevices,
  getCarriedMessages,
  BluetoothDevice as MeshBluetoothDevice,
  signalToDistance
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
  bluetoothId?: string;
  distance?: number;
  lastSeen?: string;
}

interface BluetoothContextType {
  isBluetoothEnabled: boolean;
  isScanning: boolean;
  nearbyDevices: BluetoothDevice[];
  savedContacts: SavedContact[];
  carriedMessagesCount: number;
  enableBluetooth: () => Promise<void>;
  disableBluetooth: () => void;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  isUserNearby: (userId: string) => boolean;
  getMyBluetoothId: () => string;
  getDeviceSignal: (userId: string) => number;
  getDeviceDistance: (userId: string) => number;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState<BluetoothDevice[]>([]);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [carriedMessagesCount, setCarriedMessagesCount] = useState(0);
  const meshManagerRef = useRef<MeshNetworkManager | null>(null);
  const autoScanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved contacts and persisted devices on mount
  useEffect(() => {
    setSavedContacts(getSavedContacts());
    setCarriedMessagesCount(getCarriedMessages().length);
    
    // Load persisted nearby devices
    const persisted = getPersistedNearbyDevices();
    if (persisted.length > 0) {
      const devices: BluetoothDevice[] = persisted.map(d => ({
        id: d.id,
        userId: d.userId,
        username: d.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: d.name,
        signalStrength: d.signalStrength,
        isNearby: d.isNearby,
        bluetoothId: d.bluetoothId,
        distance: d.distance,
        lastSeen: d.lastSeen
      }));
      setNearbyDevices(devices);
    }
  }, []);

  // Convert mesh devices to context devices
  const enrichDevicesFromLocal = useCallback((meshDevices: MeshBluetoothDevice[]) => {
    const contacts = getSavedContacts();
    
    const enrichedDevices: BluetoothDevice[] = meshDevices.map(device => {
      const contact = contacts.find(c => c.userId === device.userId);
      
      return {
        id: device.id,
        userId: device.userId,
        username: contact?.username || device.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: contact?.displayName || device.name,
        avatarUrl: contact?.avatarUrl,
        signalStrength: device.signalStrength,
        isNearby: device.isNearby,
        bluetoothId: device.bluetoothId,
        distance: device.distance || signalToDistance(device.signalStrength),
        lastSeen: device.lastSeen
      };
    });

    setNearbyDevices(enrichedDevices);
    setSavedContacts(getSavedContacts());
  }, []);

  // Handle signal updates from mesh manager
  const handleSignalUpdate = useCallback((meshDevices: MeshBluetoothDevice[]) => {
    enrichDevicesFromLocal(meshDevices);
    setCarriedMessagesCount(getCarriedMessages().length);
  }, [enrichDevicesFromLocal]);

  // Auto-enable Bluetooth when user is authenticated
  useEffect(() => {
    if (user) {
      const initBluetooth = async () => {
        try {
          meshManagerRef.current = getMeshManager(user.id);
          
          // Subscribe to signal updates for real-time display
          meshManagerRef.current.onSignalUpdate(handleSignalUpdate);
          
          await meshManagerRef.current.start();
          setIsBluetoothEnabled(true);
          
          // Initial scan
          await performScan();

          // Auto-scan every 5 seconds
          autoScanIntervalRef.current = setInterval(() => {
            performScan();
            setCarriedMessagesCount(getCarriedMessages().length);
          }, 5000);
        } catch (error) {
          console.error('[Bluetooth] Erreur initialisation:', error);
        }
      };

      const performScan = async () => {
        if (!meshManagerRef.current) return;
        
        setIsScanning(true);
        try {
          const devices = await meshManagerRef.current.scanForDevices();
          enrichDevicesFromLocal(devices);
        } finally {
          setIsScanning(false);
        }
      };

      initBluetooth();

      return () => {
        if (autoScanIntervalRef.current) {
          clearInterval(autoScanIntervalRef.current);
        }
        if (meshManagerRef.current) {
          meshManagerRef.current.removeSignalListener(handleSignalUpdate);
        }
      };
    }
  }, [user, enrichDevicesFromLocal, handleSignalUpdate]);

  const enableBluetooth = async () => {
    try {
      setIsBluetoothEnabled(true);
      
      if (user) {
        meshManagerRef.current = getMeshManager(user.id);
        meshManagerRef.current.onSignalUpdate(handleSignalUpdate);
        await meshManagerRef.current.start();
        
        const performScan = async () => {
          if (!meshManagerRef.current) return;
          setIsScanning(true);
          try {
            const devices = await meshManagerRef.current.scanForDevices();
            enrichDevicesFromLocal(devices);
          } finally {
            setIsScanning(false);
          }
        };

        await performScan();
        
        if (!autoScanIntervalRef.current) {
          autoScanIntervalRef.current = setInterval(() => {
            performScan();
            setCarriedMessagesCount(getCarriedMessages().length);
          }, 5000);
        }
      }
      
      toast({
        title: "Bluetooth activé",
        description: "Recherche des appareils à proximité...",
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
    
    if (meshManagerRef.current) {
      meshManagerRef.current.removeSignalListener(handleSignalUpdate);
    }
    
    setIsBluetoothEnabled(false);
    setIsScanning(false);
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
        meshManagerRef.current.onSignalUpdate(handleSignalUpdate);
        await meshManagerRef.current.start();
        setIsBluetoothEnabled(true);
      }
      
      const discoveredDevices = await meshManagerRef.current.scanForDevices();
      enrichDevicesFromLocal(discoveredDevices);
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

  const getMyBluetoothId = (): string => {
    if (meshManagerRef.current) {
      return meshManagerRef.current.getBluetoothId();
    }
    return '';
  };

  const getDeviceSignal = (userId: string): number => {
    if (meshManagerRef.current) {
      return meshManagerRef.current.getDeviceSignal(userId);
    }
    const device = nearbyDevices.find(d => d.userId === userId);
    return device?.signalStrength ?? 0;
  };

  const getDeviceDistance = (userId: string): number => {
    if (meshManagerRef.current) {
      return meshManagerRef.current.getDeviceDistance(userId);
    }
    const device = nearbyDevices.find(d => d.userId === userId);
    return device?.distance ?? -1;
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
        carriedMessagesCount,
        enableBluetooth,
        disableBluetooth,
        startScanning,
        stopScanning,
        isUserNearby,
        getMyBluetoothId,
        getDeviceSignal,
        getDeviceDistance,
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
