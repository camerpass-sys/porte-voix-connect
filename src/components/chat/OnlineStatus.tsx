import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({
  isOnline,
  size = 'md',
  className,
  showLabel = false,
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          sizeClasses[size],
          'rounded-full',
          isOnline ? 'status-online' : 'status-offline'
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
      )}
    </div>
  );
};
