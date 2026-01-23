/**
 * Add Team Members Modal
 * Modal for inviting users to a project via email
 */
import React, { useState } from 'react';
import './AddMembersModal.css';

interface AddMembersModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface EmailInput {
  email: string;
  role: string;
}

const ROLE_OPTIONS = [
  { value: 'LEAD', label: 'Project Lead' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'QA', label: 'QA Engineer' },
  { value: 'DESIGNER', label: 'Designer' },
];

const AddMembersModal: React.FC<AddMembersModalProps> = ({
  projectId,
  projectName,
  onClose,
  onSuccess,
}) => {
  const [emails, setEmails] = useState<EmailInput[]>([{ email: '', role: 'DEVELOPER' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addEmailField = () => {
    setEmails([...emails, { email: '', role: 'DEVELOPER' }]);
  };

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, field: 'email' | 'role', value: string) => {
    const updated = [...emails];
    updated[index][field] = value;
    setEmails(updated);
  };

  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const item of emails) {
      if (!item.email.trim()) {
        setError('All email fields must be filled');
        return false;
      }
      if (!emailRegex.test(item.email)) {
        setError(`Invalid email format: ${item.email}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateEmails()) {
      return;
    }

    try {
      setLoading(true);

      // Extract email list
      const emailList = emails.map(e => e.email.trim());
      const selectedRole = emails[0].role; // Use first role for all (or extend to per-email)

      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/invite-members/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            emails: emailList,
            role: selectedRole,
            message: '',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send invitations');
      }

      setSuccess(`Successfully sent ${emailList.length} invitation(s)!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error sending invitations:', err);
      setError(err.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Team Members</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-subtitle">
            Invite team members to <strong>{projectName}</strong>
          </p>

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

          <form onSubmit={handleSubmit}>
            <div className="email-inputs">
              {emails.map((item, index) => (
                <div key={index} className="email-input-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label htmlFor={`email-${index}`}>
                      Email Address {index > 0 && `#${index + 1}`}
                    </label>
                    <input
                      type="email"
                      id={`email-${index}`}
                      placeholder="user@example.com"
                      value={item.email}
                      onChange={(e) => updateEmail(index, 'email', e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor={`role-${index}`}>Role</label>
                    <select
                      id={`role-${index}`}
                      value={item.role}
                      onChange={(e) => updateEmail(index, 'role', e.target.value)}
                      disabled={loading}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {emails.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-small remove-btn"
                      onClick={() => removeEmailField(index)}
                      disabled={loading}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-outline btn-small"
              onClick={addEmailField}
              disabled={loading || emails.length >= 10}
              style={{ marginBottom: '1rem' }}
            >
              + Add Another Email
            </button>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Sending...' : `Send ${emails.length} Invitation(s)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMembersModal;
