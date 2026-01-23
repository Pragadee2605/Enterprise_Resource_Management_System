/**
 * Badge Component
 * Status indicators and labels
 */
import React from 'react';
import './Badge.css';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
}) => {
  const badgeClass = `badge badge-${variant} badge-${size} ${className}`.trim();

  return <span className={badgeClass}>{children}</span>;
};

export default Badge;
