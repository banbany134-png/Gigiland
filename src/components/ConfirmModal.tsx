import React from 'react';
import { Trash2, AlertTriangle, X, Check, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Penghapusan",
  message = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
  confirmText = "Iya, Hapus",
  cancelText = "Tidak, Batal",
  variant = 'danger',
  isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    await onConfirm();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          bgIcon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
          btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
          Icon: AlertTriangle
        };
      case 'info':
        return {
          bgIcon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
          btnConfirm: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
          Icon: Check
        };
      case 'danger':
      default:
        return {
          bgIcon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
          btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
          Icon: Trash2
        };
    }
  };

  const styles = getVariantStyles();
  const HeaderIcon = styles.Icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full relative space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-2xl shrink-0 ${styles.bgIcon}`}>
            <HeaderIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 font-display">
              {title}
            </h3>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Modal Actions - Clear Iya / Tidak */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${styles.btnConfirm}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
