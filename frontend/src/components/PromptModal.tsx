/**
 * Prompt Modal Component
 * Custom modal to replace window.prompt()
 */
import React, { useState } from 'react';
import './ConfirmModal.css';

interface PromptModalProps {
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  required?: boolean;
}

const PromptModal: React.FC<PromptModalProps> = ({
  title,
  message,
  placeholder = '',
  confirmText = 'Submit',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  required = true
}) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (required && !value.trim()) {
      return;
    }
    onConfirm(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!required || value.trim())) {
      handleSubmit();
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem' }}>{message}</p>
          <textarea
            className="form-control"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={3}
            autoFocus
            style={{ width: '100%', resize: 'vertical' }}
          />
          {required && !value.trim() && (
            <small style={{ color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
              This field is required
            </small>
          )}
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-outline"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={required && !value.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
