import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './guards/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UsersList from './pages/UsersList';
import DepartmentsList from './pages/DepartmentsList';
import ProjectsList from './pages/ProjectsList';
import ProjectsNew from './pages/ProjectsNew';
import ProjectDetail from './pages/ProjectDetail';
import TasksList from './pages/TasksList';
import TaskDetail from './pages/TaskDetail';
import KanbanBoard from './pages/KanbanBoard';
import SprintManagement from './pages/SprintManagement';
import ProductBacklog from './pages/ProductBacklog';
import AcceptInvitation from './pages/AcceptInvitation';
import TimesheetsList from './pages/TimesheetsList';
import TimesheetForm from './pages/TimesheetForm';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import Profile from './pages/Profile';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* User Management */}
            <Route path="/users" element={<UsersList />} />
            
            {/* Department Management */}
            <Route path="/departments" element={<DepartmentsList />} />
            
            {/* Project Management */}
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/new" element={<ProjectsNew />} />
            <Route path="/projects/:id/edit" element={<ProjectsNew />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            
            {/* Task Management */}
            <Route path="/tasks" element={<TasksList />} />
            <Route path="/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/kanban/:projectId" element={<KanbanBoard />} />
            <Route path="/sprints/:projectId" element={<SprintManagement />} />
            <Route path="/backlog/:projectId" element={<ProductBacklog />} />
            
            {/* Timesheet Management */}
            <Route path="/timesheets" element={<TimesheetsList />} />
            <Route path="/timesheets/new" element={<TimesheetForm />} />
            <Route path="/timesheets/:id/edit" element={<TimesheetForm />} />
            
            {/* Reports */}
            <Route path="/reports" element={<ReportsPage />} />
            
            {/* Audit Logs */}
            <Route path="/audit" element={<AuditLogPage />} />
            
            {/* Profile */}
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
