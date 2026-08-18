import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const Toast = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="toast-container" role="alert">
      <CheckCircle2 size={18} className="toast-icon" />
      <span>{message}</span>
    </div>
  );
};
