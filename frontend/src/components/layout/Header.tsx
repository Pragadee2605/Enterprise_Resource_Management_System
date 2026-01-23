/**
 * Header Component
 * Top navigation bar with user menu
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../ThemeToggle';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-logo">ERMS</h1>
        <span className="header-subtitle">Enterprise Resource Management</span>
      </div>

      <div className="header-right">
        <ThemeToggle />
        <div className="user-menu-container">
          <button
            className="user-menu-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="user-info">
              <span className="user-name">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="user-role">{user?.role}</span>
            </div>
            <svg
              className="dropdown-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showUserMenu && (
            <>
              <div
                className="user-menu-backdrop"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="user-menu-dropdown">
                <div className="user-menu-header">
                  <div className="user-menu-name">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="user-menu-email">{user?.email}</div>
                </div>
                <div className="user-menu-divider" />
                <button
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/profile');
                  }}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile
                </button>
                <button
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </button>
                <div className="user-menu-divider" />
                <button
                  className="user-menu-item user-menu-item-danger"
                  onClick={handleLogout}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
