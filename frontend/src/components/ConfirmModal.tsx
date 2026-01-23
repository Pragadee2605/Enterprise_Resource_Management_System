/**
 * Confirmation Modal Component
 * Custom modal to replace window.confirm()
 */
import React from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'success' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info'
}) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-outline"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`btn btn-${type === 'danger' ? 'danger' : type === 'success' ? 'success' : 'primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
