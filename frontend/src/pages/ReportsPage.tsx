/**
 * Reports Page
 * Generate and export various reports with enhanced UI
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { reportService, departmentService, projectService } from '../services/dataService';
import './Reports.css';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [exportingReport, setExportingReport] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    department: '',
    project: '',
  });

  // Check permissions - only ADMIN can access reports
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchSummary();
    loadFiltersData();
  }, []);

  const loadFiltersData = async () => {
    try {
      const [deptRes, projRes] = await Promise.all([
        departmentService.getAll(),
        projectService.getAll()
      ]);
      setDepartments(deptRes.data?.results || deptRes.data || []);
      setProjects(projRes.data?.results || projRes.data || []);
    } catch (err) {
      console.error('Failed to load filter options');
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await reportService.getSummary(filters);
      setSummary(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'project' | 'timesheet' | 'workload', format: 'csv' | 'pdf') => {
    try {
      setExportingReport(`${type}-${format}`);
      setError('');
      setSuccess('');
      let response;
      
      if (type === 'project') {
        response = await reportService.exportProjectReport(filters, format);
      } else if (type === 'timesheet') {
        response = await reportService.exportTimesheetReport(filters);
      } else {
        response = await reportService.exportWorkloadReport(filters);
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `${type}_report_${timestamp}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export report');
    } finally {
      setExportingReport(null);
    }
  };

  const clearFilters = () => {
    const defaultFilters = {
      startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      department: '',
      project: '',
    };
    setFilters(defaultFilters);
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>📊 Reports & Analytics</h1>
          <p className="text-secondary">Generate comprehensive business reports and insights</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="alert-close">×</button>
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="card filter-card">
        <div className="card-header">
          <div className="card-header-content">
            <h3>🔍 Report Filters</h3>
            <p>Customize your report parameters</p>
          </div>
          <button 
            className="btn btn-text"
            onClick={clearFilters}
            title="Clear all filters"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
            Clear
          </button>
        </div>
        <div className="card-body">
          <div className="filters-grid">
            <div className="form-group">
              <label className="form-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                </svg>
                Start Date
              </label>
              <input
                type="date"
                className="form-input"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                </svg>
                End Date
              </label>
              <input
                type="date"
                className="form-input"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                </svg>
                Department
              </label>
              <select
                className="form-select"
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                </svg>
                Project
              </label>
              <select
                className="form-select"
                value={filters.project}
                onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              >
                <option value="">All Projects</option>
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="filter-actions">
            <button 
              className="btn btn-primary"
              onClick={fetchSummary}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Loading...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
                  </svg>
                  Apply Filters
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="stats-grid">
          <div className="stat-card stat-card-primary">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Active Projects</div>
              <div className="stat-value">{summary.total_projects || 0}</div>
              <div className="stat-change">Total ongoing</div>
            </div>
          </div>
          <div className="stat-card stat-card-success">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-label">Active Employees</div>
              <div className="stat-value">{summary.total_employees || 0}</div>
              <div className="stat-change">Currently working</div>
            </div>
          </div>
          <div className="stat-card stat-card-warning">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-label">Pending Tasks</div>
              <div className="stat-value">{summary.total_tasks || 0}</div>
              <div className="stat-change">Awaiting completion</div>
            </div>
          </div>
          <div className="stat-card stat-card-info">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-label">Current Month Hours</div>
              <div className="stat-value">{summary.current_month_hours || 0}</div>
              <div className="stat-change">Total logged hours</div>
            </div>
          </div>
        </div>
      )}

      {/* Report Types */}
      <div className="reports-grid">
        {/* Project Report */}
        <div className="card report-card">
          <div className="report-header">
            <div className="report-icon-large">📁</div>
            <span className="report-badge">Popular</span>
          </div>
          <div className="card-body">
            <h3>Project Report</h3>
            <p className="text-secondary">
              Comprehensive overview of project progress, budget utilization, task completion rates, and team performance metrics
            </p>
            <div className="report-features">
              <div className="feature-item">✓ Progress tracking</div>
              <div className="feature-item">✓ Budget analysis</div>
              <div className="feature-item">✓ Team performance</div>
            </div>
          </div>
          <div className="card-footer">
            <button 
              className="btn btn-outline"
              onClick={() => handleExport('project', 'csv')}
              disabled={!!exportingReport}
            >
              {exportingReport === 'project-csv' ? (
                <><span className="spinner-small"></span> Exporting...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Export CSV
                </>
              )}
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => handleExport('project', 'pdf')}
              disabled={!!exportingReport}
            >
              {exportingReport === 'project-pdf' ? (
                <><span className="spinner-small"></span> Exporting...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Timesheet Report */}
        <div className="card report-card">
          <div className="report-header">
            <div className="report-icon-large">📅</div>
          </div>
          <div className="card-body">
            <h3>Timesheet Report</h3>
            <p className="text-secondary">
              Detailed breakdown of employee work hours by project, task, and date with approval status and overtime tracking
            </p>
            <div className="report-features">
              <div className="feature-item">✓ Hour tracking</div>
              <div className="feature-item">✓ Approval status</div>
              <div className="feature-item">✓ Overtime analysis</div>
            </div>
          </div>
          <div className="card-footer">
            <button 
              className="btn btn-primary btn-block"
              onClick={() => handleExport('timesheet', 'csv')}
              disabled={!!exportingReport}
            >
              {exportingReport === 'timesheet-csv' ? (
                <><span className="spinner-small"></span> Exporting...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Export CSV Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Workload Report */}
        <div className="card report-card">
          <div className="report-header">
            <div className="report-icon-large">⚖️</div>
          </div>
          <div className="card-body">
            <h3>Employee Workload Report</h3>
            <p className="text-secondary">
              Comprehensive analysis of employee workload distribution, capacity utilization, and resource allocation efficiency
            </p>
            <div className="report-features">
              <div className="feature-item">✓ Capacity planning</div>
              <div className="feature-item">✓ Resource allocation</div>
              <div className="feature-item">✓ Utilization rates</div>
            </div>
          </div>
          <div className="card-footer">
            <button 
              className="btn btn-primary btn-block"
              onClick={() => handleExport('workload', 'csv')}
              disabled={!!exportingReport}
            >
              {exportingReport === 'workload-csv' ? (
                <><span className="spinner-small"></span> Exporting...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Export CSV Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!loading && !summary && !error && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Report Data</h3>
          <p>Apply filters and click "Apply Filters" to generate report summary</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
