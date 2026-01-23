/**
 * Pending Invitations Component
 * Display pending project invitations for the current user
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PendingInvitations.css';

interface Invitation {
  id: string;
  project_name: string;
  invited_by_name: string;
  role: string;
  created_at: string;
  expires_at: string;
  token: string;
  message?: string;
}

const PendingInvitations: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/users/my-invitations/', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = await response.json();
      const invitationsList = data.data || data.results || [];
      setInvitations(invitationsList);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (token: string) => {
    navigate(`/accept-invitation?token=${token}`);
  };

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="pending-invitations">
      <div className="invitation-banner">
        <div className="banner-content">
          <div className="banner-icon">📧</div>
          <div className="banner-text">
            <h3>You have {invitations.length} pending project invitation(s)!</h3>
            <p>Click to review and accept your invitations</p>
          </div>
        </div>
      </div>

      <div className="invitations-grid">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="invitation-card">
            <div className="invitation-header">
              <h4>{invitation.project_name}</h4>
              <span className="invitation-role">{invitation.role}</span>
            </div>
            <div className="invitation-body">
              <p className="invited-by">
                Invited by <strong>{invitation.invited_by_name}</strong>
              </p>
              {invitation.message && (
                <p className="invitation-message">"{invitation.message}"</p>
              )}
              <p className="invitation-expires">
                Expires: {new Date(invitation.expires_at).toLocaleDateString()}
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleAccept(invitation.token)}
            >
              Review Invitation
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingInvitations;
