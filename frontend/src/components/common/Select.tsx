/**
 * Select Component
 * Enterprise-level select dropdown
 */
import React from 'react';
import './Select.css';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  fullWidth?: boolean;
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  fullWidth = false,
  className = '',
  placeholder,
  ...rest
}) => {
  const selectClass = `select ${error ? 'select-error' : ''} ${fullWidth ? 'select-full-width' : ''} ${className}`.trim();

  return (
    <div className={`select-wrapper ${fullWidth ? 'select-wrapper-full-width' : ''}`}>
      {label && <label className="select-label">{label}</label>}
      <select className={selectClass} {...rest}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="select-error-text">{error}</span>}
      {helperText && !error && <span className="select-helper-text">{helperText}</span>}
    </div>
  );
};

export default Select;
