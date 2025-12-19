import React from 'react';
import { Bluetooth, Loader2, Radio } from 'lucide-react';
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
    enableBluetooth, 
    startScanning 
  } = useBluetooth();

  const handleScan = async () => {
    if (!isBluetoothEnabled) {
      await enableBluetooth();
    }
    await startScanning();
  };

  return (
    <div className="flex flex-col items-center py-8 px-4">
      {/* Scanning Animation */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-6">
        {isScanning && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-primary/30 scanning-wave" />
            <span className="absolute inset-0 rounded-full border-2 border-primary/20 scanning-wave" style={{ animationDelay: '0.5s' }} />
            <span className="absolute inset-0 rounded-full border-2 border-primary/10 scanning-wave" style={{ animationDelay: '1s' }} />
          </>
        )}
        
        <div className={cn(
          'w-24 h-24 rounded-full flex items-center justify-center',
          isBluetoothEnabled 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        )}>
          {isScanning ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : (
            <Bluetooth className="w-10 h-10" />
          )}
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">
        {isScanning 
          ? 'Recherche en cours...' 
          : isBluetoothEnabled 
            ? 'Bluetooth activé' 
            : 'Bluetooth désactivé'
        }
      </h3>
      
      <p className="text-sm text-muted-foreground text-center mb-4 max-w-xs">
        {isBluetoothEnabled 
          ? 'Recherchez les utilisateurs ConnKtus à proximité'
          : 'Activez le Bluetooth pour découvrir les utilisateurs à proximité'
        }
      </p>

      <Button
        onClick={handleScan}
        disabled={isScanning}
        className="rounded-full px-6"
      >
        <Radio className="w-4 h-4 mr-2" />
        {isScanning ? 'Recherche...' : 'Scanner les appareils'}
      </Button>

      {/* Discovered Devices */}
      <AnimatePresence>
        {nearbyDevices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full mt-8"
          >
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Appareils découverts ({nearbyDevices.length})
            </h4>
            
            <div className="space-y-2">
              {nearbyDevices.map((device, index) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onDeviceSelect(device.userId)}
                  className="contact-card bg-card"
                >
                  <div className="relative">
                    <Avatar className="w-11 h-11">
                      <AvatarImage src={device.avatarUrl} alt={device.displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {device.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineStatus 
                      isOnline={device.isNearby} 
                      size="sm" 
                      className="absolute -bottom-0.5 -right-0.5" 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-foreground truncate">
                      {device.displayName}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      @{device.username} • Signal: {device.signalStrength}%
                    </p>
                  </div>

                  <div className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    device.isNearby 
                      ? 'bg-status-online/10 text-status-online' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {device.isNearby ? 'À proximité' : 'Accessible'}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
