import React from 'react';
import { useAlert } from '@/contexts/AlertContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

export const GlobalAlert = () => {
  const { alert, hideAlert } = useAlert();

  if (!alert) {
    return null;
  }

  const { message, type } = alert;
  const Icon = icons[type];

  return (
    <div className="fixed top-5 right-5 z-50">
      <Alert variant={type === 'error' ? 'destructive' : type} className="w-auto">
        {Icon}
        <AlertTitle>{type.charAt(0).toUpperCase() + type.slice(1)}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
        <button onClick={hideAlert} className="absolute top-2 right-2 text-foreground/50 hover:text-foreground">
          <XCircle className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  );
};
