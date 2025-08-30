import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface AlertOptions {
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  details?: string[];
  actionText?: string;
}

export const useModal = () => {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    onConfirm: () => void;
    loading: boolean;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    onConfirm: () => {},
    loading: false
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    options: AlertOptions;
  }>({
    isOpen: false,
    options: { title: '', message: '' }
  });

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        options,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          resolve(true);
        },
        loading: false
      });
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertModal({
        isOpen: true,
        options: {
          ...options,
          actionText: options.actionText || 'Entendi'
        }
      });
      // Auto resolve when modal is closed
      setTimeout(() => resolve(), 100);
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const setConfirmLoading = useCallback((loading: boolean) => {
    setConfirmModal(prev => ({ ...prev, loading }));
  }, []);

  return {
    // Confirm modal
    confirmModal,
    showConfirm,
    closeConfirm,
    setConfirmLoading,
    
    // Alert modal
    alertModal,
    showAlert,
    closeAlert
  };
};