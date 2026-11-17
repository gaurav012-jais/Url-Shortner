import React, { useState } from 'react';
import { UrlItem } from '../types';

interface DeleteConfirmationModalProps {
  url: UrlItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void> | void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  url,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !url) return null;

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await Promise.resolve(onConfirm(url.id));
      onClose();
    } catch (err) {
      console.error('Failed to delete URL:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !deleting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 z-10 animate-screen">
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">delete_forever</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-on-surface">Delete Short Link?</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              This action cannot be undone. Any QR codes, social posts, or campaigns pointing to this link will immediately stop redirecting.
            </p>
          </div>
        </div>

        {/* Link Info Box */}
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1.5 font-code font-bold text-primary truncate">
            <span className="material-symbols-outlined text-[15px]">link</span>
            <span>/{url.short_code}</span>
          </div>
          {url.title && (
            <p className="text-on-surface font-medium truncate">{url.title}</p>
          )}
          <p className="text-on-surface-variant font-code text-[11px] truncate" title={url.original_url}>
            &rarr; {url.original_url}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/20">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-error hover:bg-error/90 text-on-error text-xs font-semibold flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            {deleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-on-error border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

