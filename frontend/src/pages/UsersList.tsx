/**
 * Users List Page
 * Complete CRUD interface for user management with enhanced UI
 */
import React, { useState, useEffect } from 'react';
import { userService, departmentService } from '../services/dataService';
import { User, Department } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './Users.css';

const UsersList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    employee_id: '',
    role: 'EMPLOYEE',
    department: '',
    password: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll();
      setUsers(response.data.results || response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getAll();
      setDepartments(response.data.results || response.data);
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        await userService.update(selectedUser.id, formData);
        setSuccess('User updated successfully!');
      } else {
        await userService.create(formData);
        setSuccess('User created successfully!');
      }
      setShowModal(false);
      fetchUsers();
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      setDeletingId(id);
      await userService.delete(id);
      setSuccess('User deleted successfully!');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await userService.deactivate(id);
        setSuccess('User deactivated successfully!');
      } else {
        await userService.activate(id);
        setSuccess('User activated successfully!');
      }
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      employee_id: user.employee_id || '',
      role: user.role,
      department: user.department || '',
      password: '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      employee_id: '',
      role: 'EMPLOYEE',
      department: '',
      password: '',
    });
  };

  // Filter users based on search, role, and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    employees: users.filter(u => u.role === 'EMPLOYEE').length,
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return '👑';
      default: return '👤';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>👥 Users Management</h1>
          <p className="text-secondary">Manage system users, roles, and permissions</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={`btn btn-small ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 001-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 001 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
              </svg>
            </button>
            <button
              className={`btn btn-small ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('cards')}
              title="Cards View"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/>
              </svg>
            </button>
          </div>
          {currentUser?.is_admin && (
            <button 
              className="btn btn-primary" 
              onClick={() => { resetForm(); setShowModal(true); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
              </svg>
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="alert alert-success">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          {success}
          <button className="alert-close" onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          {error}
          <button className="alert-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Active Users</div>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>
        <div className="stat-card stat-card-danger">
          <div className="stat-icon">👑</div>
          <div className="stat-content">
            <div className="stat-label">Administrators</div>
            <div className="stat-value">{stats.admins}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card filter-card">
        <div className="card-body">
          <div className="filters-grid">
            <div className="form-group">
              <label className="form-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                Search
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11 6a3 3 0 11-6 0 3 3 0 016 0zM14 17a7 7 0 10-14 0h14z"/>
                </svg>
                Role
              </label>
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="ADMIN">Administrators</option>
                <option value="EMPLOYEE">Employees</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
                Status
              </label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
          {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
            <div className="filter-actions">
              <button 
                className="btn-text"
                onClick={() => { setSearchTerm(''); setRoleFilter('all'); setStatusFilter('all'); }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M4 8a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7A.5.5 0 014 8z" clipRule="evenodd"/>
                </svg>
                Clear All Filters
              </button>
              <span className="text-secondary">Showing {filteredUsers.length} of {users.length} users</span>
            </div>
          )}
        </div>
      </div>

      {/* Users Content */}
      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>No Users Found</h3>
          <p>
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by creating your first user.'}
          </p>
          {currentUser?.is_admin && !searchTerm && roleFilter === 'all' && statusFilter === 'all' && (
            <button 
              className="btn btn-primary" 
              onClick={() => { resetForm(); setShowModal(true); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
              </svg>
              Create First User
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  {currentUser?.is_admin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <div className="user-name">{user.first_name} {user.last_name}</div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.employee_id || '-'}</td>
                    <td>
                      <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                        {getRoleIcon(user.role)} {user.role}
                      </span>
                    </td>
                    <td>{user.department_details?.name || '-'}</td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-secondary'}`}>
                        {user.is_active ? '✓ Active' : '⏸ Inactive'}
                      </span>
                    </td>
                    {currentUser?.is_admin && (
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-small btn-outline"
                            onClick={() => openEditModal(user)}
                            title="Edit user"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M12.854.146a.5.5 0 00-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 000-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.207l6.5-6.5z"/>
                            </svg>
                          </button>
                          <button 
                            className="btn btn-small btn-secondary"
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                            title={user.is_active ? 'Deactivate user' : 'Activate user'}
                          >
                            {user.is_active ? '⏸' : '▶'}
                          </button>
                          <button 
                            className="btn btn-small btn-danger"
                            onClick={() => handleDelete(user.id)}
                            disabled={deletingId === user.id}
                            title="Delete user"
                          >
                            {deletingId === user.id ? (
                              <div className="spinner-small"></div>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="users-grid">
          {filteredUsers.map(user => (
            <div key={user.id} className="card user-card">
              <div className="card-body">
                <div className="user-card-header">
                  <div className="user-avatar-large">
                    {getInitials(user.first_name, user.last_name)}
                  </div>
                  <div className="user-card-info">
                    <h3>{user.first_name} {user.last_name}</h3>
                    <p className="text-secondary">{user.email}</p>
                  </div>
                  <span className={`badge ${user.is_active ? 'badge-success' : 'badge-secondary'}`}>
                    {user.is_active ? '✓ Active' : '⏸ Inactive'}
                  </span>
                </div>

                <div className="user-card-details">
                  <div className="detail-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 2a2 2 0 012-2h8a2 2 0 012 2v13.5a.5.5 0 01-.777.416L8 13.101l-5.223 2.815A.5.5 0 012 15.5V2zm2-1a1 1 0 00-1 1v12.566l4.723-2.482a.5.5 0 01.554 0L13 14.566V2a1 1 0 00-1-1H4z"/>
                    </svg>
                    <span>Employee ID: {user.employee_id || 'Not assigned'}</span>
                  </div>
                  <div className="detail-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11 6a3 3 0 11-6 0 3 3 0 016 0zM14 17a7 7 0 10-14 0h14z"/>
                    </svg>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                      {getRoleIcon(user.role)} {user.role}
                    </span>
                  </div>
                  <div className="detail-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-2.5a1 1 0 00-.8.4l-1.9 2.533a1 1 0 01-1.6 0L5.3 12.4a1 1 0 00-.8-.4H2a2 2 0 01-2-2V2z"/>
                    </svg>
                    <span>Department: {user.department_details?.name || 'Not assigned'}</span>
                  </div>
                </div>

                {currentUser?.is_admin && (
                  <div className="card-footer">
                    <button 
                      className="btn btn-small btn-outline"
                      onClick={() => openEditModal(user)}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.854.146a.5.5 0 00-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 000-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.207l6.5-6.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => handleToggleStatus(user.id, user.is_active)}
                    >
                      {user.is_active ? '⏸ Deactivate' : '▶ Activate'}
                    </button>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingId === user.id}
                    >
                      {deletingId === user.id ? (
                        <>
                          <div className="spinner-small"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clipRule="evenodd"/>
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedUser ? '📝 Edit User' : '➕ Create New User'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-section">
                  <h4 className="form-section-title">Personal Information</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label form-label-required">First Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label form-label-required">Last Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label form-label-required">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john.doe@company.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Employee ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      placeholder="EMP001"
                    />
                    <small className="text-secondary">Unique identifier for this employee</small>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="form-section-title">Role & Department</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label form-label-required">Role</label>
                      <select
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                      >
                        <option value="EMPLOYEE">👤 Employee</option>
                        <option value="ADMIN">👑 Administrator</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Department</label>
                      <select
                        className="form-select"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {!selectedUser && (
                  <div className="form-section">
                    <h4 className="form-section-title">Security</h4>
                    <div className="form-group">
                      <label className="form-label form-label-required">Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        required={!selectedUser}
                        minLength={8}
                      />
                      <small className="text-secondary">
                        Minimum 8 characters with uppercase, lowercase, number, and special character
                      </small>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M10.97 4.97a.75.75 0 011.07 1.05l-3.99 4.99a.75.75 0 01-1.08.02L4.324 8.384a.75.75 0 111.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 01.02-.022z" clipRule="evenodd"/>
                  </svg>
                  {selectedUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
