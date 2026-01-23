/**
 * Audit Log Page
 * System audit trail viewer
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auditService } from '../services/dataService';
import { AuditLog } from '../types';
import './AuditLog.css';

const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    model_name: '',
    user: '',
    start_date: '',
    end_date: '',
  });

  // Check permissions - only ADMIN can access audit logs
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.action) params.action = filters.action;
      if (filters.model_name) params.model_name = filters.model_name;
      if (filters.user) params.user = parseInt(filters.user);
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      
      const response = await auditService.getAll(params);
      setLogs(response.data.results || response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'CREATE': return 'badge-success';
      case 'UPDATE': return 'badge-primary';
      case 'DELETE': return 'badge-danger';
      case 'LOGIN': return 'badge-info';
      case 'LOGOUT': return 'badge-secondary';
      case 'APPROVE': return 'badge-success';
      case 'REJECT': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  const formatChanges = (changes: any) => {
    if (!changes) return '-';
    return JSON.stringify(changes, null, 2);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="audit-page">
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p className="text-secondary">System activity and change history</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error!</strong> {error}
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <h3>Filters</h3>
        </div>
        <div className="card-body">
          <div className="filters-grid">
            <div className="form-group">
              <label className="form-label">Action</label>
              <select
                className="form-select"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Model</label>
              <select
                className="form-select"
                value={filters.model_name}
                onChange={(e) => setFilters({ ...filters, model_name: e.target.value })}
              >
                <option value="">All Models</option>
                <option value="User">User</option>
                <option value="Department">Department</option>
                <option value="Project">Project</option>
                <option value="Task">Task</option>
                <option value="Timesheet">Timesheet</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={fetchLogs}
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="audit-timeline">
        {logs.map((log) => (
          <div key={log.id} className="timeline-item">
            <div className="timeline-marker">
              <span className={`badge ${getActionBadgeClass(log.action)}`}>
                {log.action}
              </span>
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <div>
                  <h4 className="timeline-title">
                    {log.action} {log.model_name}
                    {log.object_id && ` #${log.object_id}`}
                  </h4>
                  <p className="timeline-meta">
                    <span className="timeline-user">
                      👤 {log.user_details?.first_name} {log.user_details?.last_name}
                    </span>
                    <span className="timeline-time">
                      🕒 {new Date(log.timestamp).toLocaleString()}
                    </span>
                    {log.ip_address && (
                      <span className="timeline-ip">
                        🌐 {log.ip_address}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {log.changes && Object.keys(log.changes).length > 0 && (
                <details className="changes-details">
                  <summary>View Changes</summary>
                  <pre className="changes-code">{formatChanges(log.changes)}</pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      {logs.length === 0 && (
        <div className="empty-state">
          <p>No audit logs found</p>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
