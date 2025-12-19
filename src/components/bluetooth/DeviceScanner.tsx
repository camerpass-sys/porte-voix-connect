import React from 'react';
import { Bluetooth, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBluetooth } from '@/contexts/BluetoothContext';
import { OnlineStatus } from '@/components/chat/OnlineStatus';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DeviceScannerProps {
  onDeviceSelect: (userId: string) => void;
}

export const DeviceScanner: React.FC<DeviceScannerProps> = ({ onDeviceSelect }) => {
  const { 
    isBluetoothEnabled, 
    isScanning, 
    nearbyDevices,
    savedContacts,
    enableBluetooth, 
    startScanning 
  } = useBluetooth();

  const handleRefresh = async () => {
    if (!isBluetoothEnabled) {
      await enableBluetooth();
    }
    await startScanning();
  };

  // Combine nearby devices with saved contacts (excluding duplicates)
  const allContacts = [
    ...nearbyDevices,
    ...savedContacts
      .filter(c => !nearbyDevices.some(d => d.userId === c.userId))
      .map(c => ({
        id: c.userId,
        userId: c.userId,
        username: c.username,
        displayName: c.displayName,
        avatarUrl: c.avatarUrl,
        signalStrength: 0,
        isNearby: false,
      }))
  ];

  return (
    <div className="flex flex-col py-4 px-4">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-3 h-3 rounded-full',
            isBluetoothEnabled ? 'bg-status-online' : 'bg-status-offline'
          )} />
          <span className="text-sm font-medium">
            {isScanning ? 'Recherche en cours...' : isBluetoothEnabled ? 'Bluetooth actif' : 'Bluetooth inactif'}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isScanning}
          className="rounded-full"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-2">Actualiser</span>
        </Button>
      </div>

      {/* Scanning Animation */}
      {isScanning && (
        <div className="flex items-center justify-center py-8">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-primary/30 scanning-wave" />
            <span className="absolute inset-0 rounded-full border-2 border-primary/20 scanning-wave" style={{ animationDelay: '0.5s' }} />
            <Bluetooth className="w-10 h-10 text-primary" />
          </div>
        </div>
      )}

      {/* Nearby Devices */}
      {nearbyDevices.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-online animate-pulse" />
            À proximité ({nearbyDevices.length})
          </h4>
          
          <div className="space-y-2">
            <AnimatePresence>
              {nearbyDevices.map((device, index) => (
                <motion.div
                  key={device.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onDeviceSelect(device.userId)}
                  className="contact-card bg-card border border-status-online/20"
                >
                  <div className="relative">
                    <Avatar className="w-11 h-11">
                      <AvatarImage src={device.avatarUrl} alt={device.displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {device.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineStatus 
                      isOnline={true} 
                      size="sm" 
                      className="absolute -bottom-0.5 -right-0.5" 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-foreground truncate">
                      {device.displayName}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      @{device.username} • {device.signalStrength}%
                    </p>
                  </div>

                  <span className="px-2 py-1 rounded-full bg-status-online/10 text-status-online text-xs font-medium">
                    Connecter
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Saved Contacts (Offline accessible) */}
      {savedContacts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Contacts enregistrés ({savedContacts.length})
          </h4>
          
          <div className="space-y-2">
            {savedContacts
              .filter(c => !nearbyDevices.some(d => d.userId === c.userId))
              .map((contact) => (
                <div
                  key={contact.userId}
                  onClick={() => onDeviceSelect(contact.userId)}
                  className="contact-card bg-card/50"
                >
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={contact.avatarUrl} alt={contact.displayName} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {contact.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-foreground truncate">
                      {contact.displayName}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      @{contact.username}
                    </p>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    Hors ligne
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allContacts.length === 0 && !isScanning && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bluetooth className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">Aucun appareil détecté</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Les utilisateurs ConnKtus à proximité apparaîtront ici
          </p>
          <Button onClick={handleRefresh} className="rounded-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Rechercher
          </Button>
        </div>
      )}
    </div>
  );
};
