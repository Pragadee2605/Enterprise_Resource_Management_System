/**
 * MainLayout Component
 * Main application layout wrapper with Header and Sidebar
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      <Header />
      <div className="layout-container">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
