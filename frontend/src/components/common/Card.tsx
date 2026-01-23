/**
 * Card Component
 * Container for content sections
 */
import React from 'react';
import './Card.css';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  padding = 'medium',
  hoverable = false,
}) => {
  const cardClass = `card card-padding-${padding} ${hoverable ? 'card-hoverable' : ''} ${className}`.trim();

  return (
    <div className={cardClass}>
      {title && <div className="card-header">{title}</div>}
      <div className="card-body">{children}</div>
    </div>
  );
};

export default Card;
