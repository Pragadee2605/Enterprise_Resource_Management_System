/**
 * Input Component
 * Enterprise-level form input with validation
 */
import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  icon,
  className = '',
  ...rest
}) => {
  const inputClass = `input ${error ? 'input-error' : ''} ${fullWidth ? 'input-full-width' : ''} ${icon ? 'input-with-icon' : ''} ${className}`.trim();

  return (
    <div className={`input-wrapper ${fullWidth ? 'input-wrapper-full-width' : ''}`}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input className={inputClass} {...rest} />
      </div>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
};

export default Input;
