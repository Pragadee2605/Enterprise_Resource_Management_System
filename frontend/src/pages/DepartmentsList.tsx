/**
 * Departments List Page
 * Department management interface with enhanced UI
 */
import React, { useState, useEffect } from 'react';
import { departmentService } from '../services/dataService';
import { Department } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './Departments.css';

const DepartmentsList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    manager: '',
    is_active: true,
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentService.getAll();
      setDepartments(response.data.results || response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedDept) {
        await departmentService.update(selectedDept.id, formData);
        setSuccess('Department updated successfully!');
      } else {
        await departmentService.create(formData);
        setSuccess('Department created successfully!');
      }
      setShowModal(false);
      fetchDepartments();
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save department');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this department? This action cannot be undone.')) return;
    try {
      setDeletingId(id);
      await departmentService.delete(id);
      setSuccess('Department deleted successfully!');
      fetchDepartments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete department');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await departmentService.deactivate(id);
        setSuccess('Department deactivated successfully!');
      } else {
        await departmentService.activate(id);
        setSuccess('Department activated successfully!');
      }
      fetchDepartments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openEditModal = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      manager: dept.manager || '',
      is_active: dept.is_active,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedDept(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      manager: '',
      is_active: true,
    });
  };

  // Filter departments based on search and status
  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          dept.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && dept.is_active) ||
                          (statusFilter === 'inactive' && !dept.is_active);
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: departments.length,
    active: departments.filter(d => d.is_active).length,
    inactive: departments.filter(d => !d.is_active).length,
    totalEmployees: departments.reduce((sum, d) => sum + (d.employee_count || 0), 0),
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading departments...</p>
      </div>
    );
  }

  return (
    <div className="departments-page">
      <div className="page-header">
        <div>
          <h1>🏢 Departments</h1>
          <p className="text-secondary">Manage organizational departments and structure</p>
        </div>
        {currentUser?.is_admin && (
          <button 
            className="btn btn-primary" 
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
            </svg>
            Add Department
          </button>
        )}
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
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Departments</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Active</div>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-icon">⏸️</div>
          <div className="stat-content">
            <div className="stat-label">Inactive</div>
            <div className="stat-value">{stats.inactive}</div>
          </div>
        </div>
        <div className="stat-card stat-card-info">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{stats.totalEmployees}</div>
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
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                <option value="all">All Departments</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
          {(searchTerm || statusFilter !== 'all') && (
            <div className="filter-actions">
              <button 
                className="btn-text"
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M4 8a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7A.5.5 0 014 8z" clipRule="evenodd"/>
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Departments Grid */}
      {filteredDepartments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No Departments Found</h3>
          <p>
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by creating your first department.'}
          </p>
          {currentUser?.is_admin && !searchTerm && statusFilter === 'all' && (
            <button 
              className="btn btn-primary" 
              onClick={() => { resetForm(); setShowModal(true); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
              </svg>
              Create First Department
            </button>
          )}
        </div>
      ) : (
        <div className="departments-grid">
          {filteredDepartments.map(dept => (
            <div key={dept.id} className="card department-card">
              <div className="card-body">
                <div className="department-header">
                  <div>
                    <h3>{dept.name}</h3>
                    <span className="department-code">{dept.code}</span>
                  </div>
                  <span className={`badge ${dept.is_active ? 'badge-success' : 'badge-secondary'}`}>
                    {dept.is_active ? '✓ Active' : '⏸ Inactive'}
                  </span>
                </div>

                {dept.description && (
                  <p className="department-description">{dept.description}</p>
                )}

                <div className="department-info">
                  <div className="info-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="info-icon">
                      <path d="M11 6a3 3 0 11-6 0 3 3 0 016 0zM14 17a7 7 0 10-14 0h14z"/>
                    </svg>
                    <div>
                      <span className="info-label">Manager</span>
                      <span className="info-value">
                        {dept.manager_details?.first_name && dept.manager_details?.last_name
                          ? `${dept.manager_details.first_name} ${dept.manager_details.last_name}`
                          : 'Not assigned'}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="info-icon">
                      <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 100-6 3 3 0 000 6z"/>
                      <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 015 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 005 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                      <path d="M4.5 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
                    </svg>
                    <div>
                      <span className="info-label">Employees</span>
                      <span className="info-value">{dept.employee_count || 0}</span>
                    </div>
                  </div>
                </div>

                {currentUser?.is_admin && (
                  <div className="card-footer">
                    <button 
                      className="btn btn-small btn-outline"
                      onClick={() => openEditModal(dept)}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.854.146a.5.5 0 00-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 000-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.207l6.5-6.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => handleToggleStatus(dept.id, dept.is_active)}
                    >
                      {dept.is_active ? '⏸ Deactivate' : '▶ Activate'}
                    </button>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(dept.id)}
                      disabled={deletingId === dept.id}
                    >
                      {deletingId === dept.id ? (
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedDept ? '📝 Edit Department' : '➕ Create New Department'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label form-label-required">Department Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Human Resources"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label form-label-required">Department Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., HR"
                    required
                    maxLength={10}
                  />
                  <small className="text-secondary">Unique identifier for this department (max 10 characters)</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the department's responsibilities..."
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span>Department is active</span>
                  </label>
                  <small className="text-secondary">Inactive departments won't be available for employee assignment</small>
                </div>
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
                  {selectedDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsList;
