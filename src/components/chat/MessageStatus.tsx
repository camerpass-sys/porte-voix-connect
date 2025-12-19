import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageStatusProps {
  status: 'pending' | 'sent' | 'delivered' | 'seen';
  className?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ status, className }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-status-sent" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-status-sent check-animate" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-status-delivered check-animate" />;
      case 'seen':
        return <CheckCheck className="w-3.5 h-3.5 text-status-seen check-animate" />;
      default:
        return null;
    }
  };

  return (
    <span className={cn('inline-flex items-center', className)}>
      {getStatusIcon()}
    </span>
  );
};
