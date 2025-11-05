import { useErrorStore } from '../store/errorStore';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function ErrorModal() {
  const { message, clearError } = useErrorStore();

  useEffect(() => {
    if (message) {
      toast.error(message, {
        duration: 5000,
        onDismiss: clearError,
        onAutoClose: clearError,
      });
      clearError();
    }
  }, [message, clearError]);

  return null;
}
