/**
 * Common Button Component
 * Enterprise-level reusable button with multiple variants
 */
import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...rest
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const fullWidthClass = fullWidth ? 'btn-full-width' : '';
  const loadingClass = loading ? 'btn-loading' : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${fullWidthClass} ${loadingClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="btn-spinner"></span>}
      {icon && !loading && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
