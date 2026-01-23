/**
 * Timesheets List Page
 * Timesheet submission and tracking
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { timesheetService } from '../services/dataService';
import { Timesheet } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Toast, { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import PromptModal from '../components/PromptModal';
import './Timesheets.css';

const TimesheetsList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedProjectId = searchParams.get('project');
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<Timesheet[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'pending'>('my');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canViewPending, setCanViewPending] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState<{ 
    title: string; 
    message: string; 
    onConfirm: () => void;
    type?: 'danger' | 'success' | 'warning' | 'info';
  } | null>(null);
  const [promptModal, setPromptModal] = useState<{
    title: string;
    message: string;
    onConfirm: (value: string) => void;
  } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchTimesheets();
    fetchPendingTimesheets();
  }, []);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const response = await timesheetService.getAll();
      const data: any = response.data;
      // Handle nested data structure: { success, message, data: [...] }
      const timesheetsData = data.data || data.results || data || [];
      setTimesheets(Array.isArray(timesheetsData) ? timesheetsData : []);
      setError('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch timesheets';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingTimesheets = async () => {
    try {
      const response = await timesheetService.getPending();
      const data: any = response.data;
      // Handle nested data structure: { success, message, data: [...] }
      const pending = data.data || data.results || data || [];
      setPendingTimesheets(Array.isArray(pending) ? pending : []);
      // If API call succeeds, user can view pending (admin or project manager)
      setCanViewPending(true);
      console.log('Fetched pending timesheets:', pending);
    } catch (err: any) {
      console.error('Failed to fetch pending timesheets:', err);
      setPendingTimesheets([]);
      setCanViewPending(false);
    }
  };

  const handleApprove = async (id: string) => {
    setConfirmModal({
      title: 'Approve Timesheet',
      message: 'Are you sure you want to approve this timesheet?',
      type: 'success',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await timesheetService.approve(id, { status: 'APPROVED' });
          showToast('Timesheet approved successfully', 'success');
          fetchPendingTimesheets();
          fetchTimesheets();
        } catch (err: any) {
          const errorMsg = err.response?.data?.message || 'Failed to approve timesheet';
          setError(errorMsg);
          showToast(errorMsg, 'error');
        }
      }
    });
  };

  const handleReject = async (id: string) => {
    setPromptModal({
      title: 'Reject Timesheet',
      message: 'Please provide a reason for rejection:',
      onConfirm: async (comments: string) => {
        setPromptModal(null);
        try {
          await timesheetService.approve(id, { status: 'REJECTED', comments });
          showToast('Timesheet rejected successfully', 'success');
          fetchPendingTimesheets();
          fetchTimesheets();
        } catch (err: any) {
          const errorMsg = err.response?.data?.message || 'Failed to reject timesheet';
          setError(errorMsg);
          showToast(errorMsg, 'error');
        }
      }
    });
  };

  const handleSubmitForApproval = async (id: string) => {
    setConfirmModal({
      title: 'Submit Timesheet',
      message: 'Are you sure you want to submit this timesheet for approval?',
      type: 'info',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await timesheetService.submit(id);
          showToast('Timesheet submitted for approval', 'success');
          fetchTimesheets();
        } catch (err: any) {
          const errorMsg = err.response?.data?.message || 'Failed to submit timesheet';
          setError(errorMsg);
          showToast(errorMsg, 'error');
        }
      }
    });
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      title: 'Delete Timesheet',
      message: 'Are you sure you want to delete this timesheet? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await timesheetService.delete(id);
          showToast('Timesheet deleted successfully', 'success');
          fetchTimesheets();
        } catch (err: any) {
          const errorMsg = err.response?.data?.message || 'Failed to delete timesheet';
          setError(errorMsg);
          showToast(errorMsg, 'error');
        }
      }
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'badge-secondary';
      case 'SUBMITTED': return 'badge-warning';
      case 'APPROVED': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const getTotalHours = () => {
    return timesheets
      .filter(ts => ts.status === 'APPROVED')
      .reduce((sum, ts) => sum + parseFloat(ts.hours.toString()), 0)
      .toFixed(2);
  };

  const getPendingCount = () => {
    return timesheets.filter(ts => ts.status === 'SUBMITTED').length;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading timesheets...</p>
      </div>
    );
  }

  return (
    <div className="timesheets-page">
      <div className="page-header">
        <div>
          <h1>Timesheets</h1>
          <p className="text-secondary">Track your work hours</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate(preSelectedProjectId ? `/timesheets/new?project=${preSelectedProjectId}` : '/timesheets/new')}
        >
          <span>+</span> Log Hours
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error!</strong> {error}
        </div>
      )}

      {preSelectedProjectId && (
        <div className="alert" style={{ 
          background: '#dbeafe', 
          border: '1px solid #3b82f6', 
          color: '#1e40af',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
          <span>
            <strong>Project Selected:</strong> Click "Log Hours" to add time entries for this project
          </span>
        </div>
      )}

      {/* Tabs - show if user is admin or project manager */}
      {canViewPending && (
        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`tab ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            My Timesheets
          </button>
          <button
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Approval ({pendingTimesheets.length})
          </button>
        </div>
      )}

      {/* Summary Cards - only for "my" tab */}
      {activeTab === 'my' && (
        <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">⏱️</div>
          <div className="summary-content">
            <div className="summary-label">Total Approved Hours</div>
            <div className="summary-value">{getTotalHours()} hrs</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📝</div>
          <div className="summary-content">
            <div className="summary-label">Total Entries</div>
            <div className="summary-value">{timesheets.length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⏳</div>
          <div className="summary-content">
            <div className="summary-label">Pending Approval</div>
            <div className="summary-value">{getPendingCount()}</div>
          </div>
        </div>
      </div>
      )}

      {/* Timesheets Table - My Timesheets */}
      {activeTab === 'my' && (
      <div className="card">
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Hours</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map(timesheet => (
                  <tr key={timesheet.id}>
                    <td>{new Date(timesheet.date).toLocaleDateString()}</td>
                    <td>{timesheet.project_details?.name || '-'}</td>
                    <td>{timesheet.task_details?.title || '-'}</td>
                    <td><strong>{timesheet.hours} hrs</strong></td>
                    <td className="description-cell">
                      {timesheet.description || '-'}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(timesheet.status)}`}>
                        {timesheet.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {timesheet.status === 'DRAFT' && (
                          <>
                            <button 
                              className="btn btn-small btn-outline"
                              onClick={() => navigate(`/timesheets/${timesheet.id}/edit`)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-small btn-primary"
                              onClick={() => handleSubmitForApproval(timesheet.id)}
                            >
                              Submit
                            </button>
                            <button 
                              className="btn btn-small btn-danger"
                              onClick={() => handleDelete(timesheet.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {timesheet.status === 'REJECTED' && timesheet.rejection_reason && (
                          <button 
                            className="btn btn-small btn-outline"
                            title={timesheet.rejection_reason}
                          >
                            View Reason
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* Pending Approval Table */}
      {activeTab === 'pending' && (
      <div className="card">
        <div className="card-body">
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
            Timesheets Pending Your Approval
          </h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Hours</th>
                  <th>Description</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTimesheets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      No pending timesheets to approve
                    </td>
                  </tr>
                ) : (
                  pendingTimesheets.map(timesheet => (
                    <tr key={timesheet.id}>
                      <td>
                        <strong>{timesheet.employee_details?.first_name} {timesheet.employee_details?.last_name}</strong>
                        <br />
                        <small className="text-secondary">{timesheet.employee_details?.email}</small>
                      </td>
                      <td>{new Date(timesheet.date).toLocaleDateString()}</td>
                      <td>{timesheet.project_details?.name || '-'}</td>
                      <td>{timesheet.task_details?.title || '-'}</td>
                      <td><strong>{timesheet.hours} hrs</strong></td>
                      <td className="description-cell">
                        {timesheet.description || '-'}
                      </td>
                      <td>
                        <small className="text-secondary">
                          {timesheet.submitted_at ? new Date(timesheet.submitted_at).toLocaleString() : '-'}
                        </small>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-small btn-success"
                            onClick={() => handleApprove(timesheet.id)}
                          >
                            ✓ Approve
                          </button>
                          <button 
                            className="btn btn-small btn-danger"
                            onClick={() => handleReject(timesheet.id)}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Prompt Modal */}
      {promptModal && (
        <PromptModal
          title={promptModal.title}
          message={promptModal.message}
          placeholder="Enter reason for rejection..."
          onConfirm={promptModal.onConfirm}
          onCancel={() => setPromptModal(null)}
        />
      )}
    </div>
  );
};

export default TimesheetsList;
