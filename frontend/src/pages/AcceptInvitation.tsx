/**
 * Accept Invitation Page
 * Page for accepting project invitations
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import Button from '../components/common/Button';
import './AcceptInvitation.css';

const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      return;
    }

    // Fetch invitation details
    loadInvitationDetails();
  }, [token]);

  const loadInvitationDetails = async () => {
    try {
      const response = await apiService.get('/projects/invitations/', {
        params: { token },
      });
      
      const invitations = response.data.results || response.data.data || [];
      if (invitations.length > 0) {
        setInvitation(invitations[0]);
      } else {
        setError('Invitation not found');
      }
    } catch (error) {
      console.error('Failed to load invitation:', error);
      setError('Failed to load invitation details');
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/accept-invitation?token=${token}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiService.post('/projects/accept-invitation/', {
        token,
      });

      setSuccess(true);
      
      // Redirect to project after 2 seconds
      setTimeout(() => {
        const projectId = response.data.data?.project_id || response.data.project_id;
        if (projectId) {
          navigate(`/projects/${projectId}`);
        } else {
          navigate('/projects');
        }
      }, 2000);
    } catch (error: any) {
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="accept-invitation-page">
        <div className="invitation-card">
          <div className="error-icon">❌</div>
          <h2>Invalid Invitation Link</h2>
          <p>The invitation link is invalid or has been removed.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="accept-invitation-page">
        <div className="invitation-card">
          <div className="success-icon">✅</div>
          <h2>Invitation Accepted!</h2>
          <p>You have successfully joined the project. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="accept-invitation-page">
      <div className="invitation-card">
        <h1>Project Invitation</h1>
        
        {invitation && (
          <>
            <div className="invitation-details">
              <p>
                <strong>{invitation.invited_by_name}</strong> has invited you to join:
              </p>
              <h2 className="project-name">{invitation.project_name}</h2>
              
              {invitation.message && (
                <div className="invitation-message">
                  <p>{invitation.message}</p>
                </div>
              )}

              <div className="invitation-meta">
                <p>Role: <strong>{invitation.role}</strong></p>
                <p>Expires: {new Date(invitation.expires_at).toLocaleDateString()}</p>
              </div>

              {invitation.is_expired && (
                <div className="expiration-warning">
                  ⚠️ This invitation has expired
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">{error}</div>
            )}

            {!user ? (
              <div className="auth-required">
                <p>You need to sign in to accept this invitation</p>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/login?redirect=/accept-invitation?token=${token}`)}
                >
                  Sign In
                </Button>
              </div>
            ) : !invitation.is_expired ? (
              <div className="invitation-actions">
                <Button
                  variant="primary"
                  onClick={handleAccept}
                  loading={loading}
                  fullWidth
                >
                  Accept Invitation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  fullWidth
                >
                  Decline
                </Button>
              </div>
            ) : null}
          </>
        )}

        {!invitation && !error && (
          <div className="loading-state">Loading invitation details...</div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
