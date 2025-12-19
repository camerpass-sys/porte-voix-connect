import React from 'react';
import { Bluetooth, BluetoothOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBluetooth } from '@/contexts/BluetoothContext';
import { cn } from '@/lib/utils';

interface BluetoothToggleProps {
  className?: string;
}

export const BluetoothToggle: React.FC<BluetoothToggleProps> = ({ className }) => {
  const { isBluetoothEnabled, isScanning, enableBluetooth, disableBluetooth } = useBluetooth();

  const handleToggle = () => {
    if (isBluetoothEnabled) {
      disableBluetooth();
    } else {
      enableBluetooth();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className={cn(
        'relative text-primary-foreground hover:bg-primary-foreground/10',
        className
      )}
    >
      {isScanning ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isBluetoothEnabled ? (
        <>
          <Bluetooth className="w-5 h-5 bluetooth-pulse" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-online" />
        </>
      ) : (
        <BluetoothOff className="w-5 h-5" />
      )}
    </Button>
  );
};
