import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';import { authService } from '../services/authService';import './Profile.css';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  country_code: string;
  role: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Country code to flag mapping
const COUNTRY_FLAGS: Record<string, string> = {
  '+1': 'us',
  '+44': 'gb',
  '+91': 'in',
  '+86': 'cn',
  '+81': 'jp',
  '+49': 'de',
  '+33': 'fr',
  '+39': 'it',
  '+34': 'es',
  '+61': 'au',
  '+55': 'br',
  '+7': 'ru',
  '+82': 'kr',
  '+971': 'ae',
  '+65': 'sg',
  '+52': 'mx',
  '+27': 'za',
  '+31': 'nl',
  '+46': 'se',
  '+41': 'ch',
};

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [loading, setLoading] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    country_code: '+1',
    role: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      // Extract country code from phone number if it exists
      const phoneNumber = user.phone_number || '';
      let countryCode = '+1';
      let localNumber = phoneNumber;
      
      if (phoneNumber) {
        const match = phoneNumber.match(/^(\+\d{1,3})(.*)$/);
        if (match) {
          countryCode = match[1];
          localNumber = match[2].trim();
        }
      }
      
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: localNumber,
        country_code: countryCode,
        role: user.role || '',
      });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine country code and phone number
      const fullPhoneNumber = profileData.phone_number 
        ? `${profileData.country_code} ${profileData.phone_number}`.trim()
        : '';

      const response = await authService.updateProfile({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone_number: fullPhoneNumber,
      });

      if (response.success) {
        showToast('Profile updated successfully!', 'success');
        // Update the user in context
        if (response.data) {
          updateUser(response.data);
        }
      } else {
        showToast(response.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('An error occurred while updating profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (passwordData.new_password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Password changed successfully!', 'success');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      } else {
        showToast(data.message || 'Failed to change password', 'error');
      }
    } catch (error) {
      console.error('Password change error:', error);
      showToast('An error occurred while changing password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar-large">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="profile-header-info">
            <h1 className="profile-header-title">
              {user?.first_name} {user?.last_name}
            </h1>
            <p className="profile-header-email">{user?.email}</p>
            <span className="profile-role-badge">{user?.role}</span>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Profile Information
          </button>
          {user?.has_usable_password && (
            <button
              className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Change Password
            </button>
          )}
        </div>

        {activeTab === 'profile' ? (
          <div className="profile-card">
            <form onSubmit={handleProfileSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="first_name">First Name</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={profileData.first_name}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="last_name">Last Name</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={profileData.last_name}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    disabled
                    className="disabled-input"
                  />
                  <small className="form-help">Email cannot be changed</small>
                </div>

                <div className="form-group">
                  <label htmlFor="phone_number">Phone Number</label>
                  <div className="phone-input-group">
                    <div className="country-selector">
                      {profileData.country_code && COUNTRY_FLAGS[profileData.country_code] && (
                        <img 
                          src={`https://flagcdn.com/24x18/${COUNTRY_FLAGS[profileData.country_code]}.png`}
                          alt={`${profileData.country_code} flag`}
                          className="flag-icon"
                          loading="lazy"
                        />
                      )}
                      <select
                        name="country_code"
                        id="country_code"
                        value={profileData.country_code}
                        onChange={handleProfileChange}
                        className="country-code-select"
                        aria-label="Country code"
                      >
                        <option value="+1">United States (+1)</option>
                        <option value="+44">United Kingdom (+44)</option>
                        <option value="+91">India (+91)</option>
                        <option value="+86">China (+86)</option>
                        <option value="+81">Japan (+81)</option>
                        <option value="+49">Germany (+49)</option>
                        <option value="+33">France (+33)</option>
                        <option value="+39">Italy (+39)</option>
                        <option value="+34">Spain (+34)</option>
                        <option value="+61">Australia (+61)</option>
                        <option value="+55">Brazil (+55)</option>
                        <option value="+7">Russia (+7)</option>
                        <option value="+82">South Korea (+82)</option>
                        <option value="+971">UAE (+971)</option>
                        <option value="+65">Singapore (+65)</option>
                        <option value="+52">Mexico (+52)</option>
                        <option value="+27">South Africa (+27)</option>
                        <option value="+31">Netherlands (+31)</option>
                        <option value="+46">Sweden (+46)</option>
                        <option value="+41">Switzerland (+41)</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={profileData.phone_number}
                      onChange={handleProfileChange}
                      placeholder="555-000-0000"
                      className="phone-number-input"
                      inputMode="tel"
                      aria-label="Phone number"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={profileData.role}
                    disabled
                    className="disabled-input"
                  />
                  <small className="form-help">Role is assigned by administrators</small>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
            
            {!user?.has_usable_password && (
              <div className="oauth-info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <strong>Signed in with Google</strong>
                  <p>You're using Google to sign in, so you don't need a password for this account.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="profile-card">
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label htmlFor="current_password">Current Password</label>
                <input
                  type="password"
                  id="current_password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new_password">New Password</label>
                <input
                  type="password"
                  id="new_password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                />
                <small className="form-help">Must be at least 8 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
