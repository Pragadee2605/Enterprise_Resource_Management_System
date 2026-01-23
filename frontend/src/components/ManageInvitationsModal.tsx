/**
 * Manage Invitations Modal
 * View, edit, resend, and delete project invitations
 */
import React, { useState, useEffect } from 'react';
import './ManageInvitationsModal.css';

interface Invitation {
  id: number;
  email: string;
  role: string;
  status: string;
  message: string;
  invited_by_name: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
}

interface ManageInvitationsModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: 'LEAD', label: 'Project Lead' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'QA', label: 'QA Engineer' },
  { value: 'DESIGNER', label: 'Designer' },
];

const ManageInvitationsModal: React.FC<ManageInvitationsModalProps> = ({
  projectId,
  projectName,
  onClose,
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invitations/`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setInvitations(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invitations/${invitationId}/resend/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSuccess('Invitation resent successfully!');
        setTimeout(() => setSuccess(''), 3000);
        fetchInvitations();
      } else {
        setError(data.message || 'Failed to resend invitation');
      }
    } catch (err) {
      setError('Failed to resend invitation');
    }
  };

  const handleDelete = async (invitationId: number) => {
    if (!window.confirm('Are you sure you want to delete this invitation?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invitations/${invitationId}/`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (response.ok || response.status === 204) {
        setSuccess('Invitation deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
        fetchInvitations();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete invitation');
      }
    } catch (err) {
      setError('Failed to delete invitation');
    }
  };

  const startEdit = (invitation: Invitation) => {
    setEditingId(invitation.id);
    setEditRole(invitation.role);
    setEditMessage(invitation.message || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRole('');
    setEditMessage('');
  };

  const saveEdit = async (invitationId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invitations/${invitationId}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            role: editRole,
            message: editMessage,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSuccess('Invitation updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
        setEditingId(null);
        fetchInvitations();
      } else {
        setError(data.message || 'Failed to update invitation');
      }
    } catch (err) {
      setError('Failed to update invitation');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: string, isExpired: boolean) => {
    if (isExpired) return <span className="status-badge expired">Expired</span>;
    
    const badges: Record<string, JSX.Element> = {
      PENDING: <span className="status-badge pending">Pending</span>,
      ACCEPTED: <span className="status-badge accepted">Accepted</span>,
      DECLINED: <span className="status-badge declined">Declined</span>,
      REJECTED: <span className="status-badge declined">Rejected</span>,
    };
    return badges[status] || <span className="status-badge">{status}</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Invitations - {projectName}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-danger">
              <strong>Error!</strong> {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <strong>Success!</strong> {success}
            </div>
          )}

          {loading ? (
            <div className="loading-state">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="empty-state">
              <p>No invitations found for this project.</p>
            </div>
          ) : (
            <div className="invitations-table">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Invited By</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td>
                        <strong>{invitation.email}</strong>
                        {invitation.message && editingId !== invitation.id && (
                          <div className="invitation-message-preview">
                            {invitation.message}
                          </div>
                        )}
                      </td>
                      <td>
                        {editingId === invitation.id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="role-select-small"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="role-badge">{invitation.role}</span>
                        )}
                        {editingId === invitation.id && (
                          <input
                            type="text"
                            placeholder="Optional message"
                            value={editMessage}
                            onChange={(e) => setEditMessage(e.target.value)}
                            className="message-input-small"
                          />
                        )}
                      </td>
                      <td>{getStatusBadge(invitation.status, invitation.is_expired)}</td>
                      <td>{invitation.invited_by_name}</td>
                      <td className={invitation.is_expired ? 'text-danger' : ''}>
                        {formatDate(invitation.expires_at)}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {editingId === invitation.id ? (
                            <>
                              <button
                                className="btn-icon success"
                                onClick={() => saveEdit(invitation.id)}
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                className="btn-icon"
                                onClick={cancelEdit}
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          ) : invitation.status === 'PENDING' ? (
                            <>
                              <button
                                className="btn-icon"
                                onClick={() => startEdit(invitation)}
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                className="btn-icon primary"
                                onClick={() => handleResend(invitation.id)}
                                title="Resend"
                              >
                                ↻
                              </button>
                              <button
                                className="btn-icon danger"
                                onClick={() => handleDelete(invitation.id)}
                                title="Delete"
                              >
                                🗑
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn-icon danger"
                              onClick={() => handleDelete(invitation.id)}
                              title="Delete"
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageInvitationsModal;
