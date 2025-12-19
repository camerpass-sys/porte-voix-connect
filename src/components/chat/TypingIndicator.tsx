import React from 'react';
import { cn } from '@/lib/utils';

export const TypingIndicator: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-center gap-1 px-4 py-2', className)}>
      <div className="message-bubble-received flex items-center gap-1 py-3">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-typing-1" />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-typing-2" />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-typing-3" />
      </div>
    </div>
  );
};
