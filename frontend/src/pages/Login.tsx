import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Check for OAuth callback
  useEffect(() => {
    const checkOAuthSession = async () => {
      const oauthSuccess = searchParams.get('oauth');
      const oauthEmail = searchParams.get('email');
      const oauthError = searchParams.get('error');

      if (oauthSuccess === 'success' && oauthEmail) {
        setLoading(true);
        try {
          // Wait a bit for session cookie to be set
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if session is valid - use localhost to match cookie domain
          const response = await fetch('http://localhost:8000/api/v1/auth/oauth/check-session', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (response.ok && data.authenticated) {
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAuthenticated', 'true');
            console.log('OAuth login successful:', data.user.email);
            navigate('/dashboard');
          } else {
            console.error('OAuth session check failed:', data);
            setError('OAuth session expired. Please try logging in normally.');
          }
        } catch (err) {
          console.error('OAuth session check error:', err);
          setError('Failed to verify OAuth session. Please try logging in normally.');
        } finally {
          setLoading(false);
        }
      } else if (oauthError) {
        if (oauthError === 'oauth_failed') {
          setError('Google authentication failed. Please try again.');
        } else if (oauthError === 'oauth_error') {
          setError('An error occurred during Google authentication.');
        }
      }
    };

    checkOAuthSession();
  }, [searchParams, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await login(formData.email, formData.password);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Use localhost instead of 127.0.0.1 for consistent cookie domain
    window.location.href = 'http://localhost:8000/accounts/google/login/?process=login';
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-logo">ERMS</h1>
          <h2 className="login-title">Enterprise Resource Management System</h2>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          className="google-login-button"
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <div className="login-footer">
          <p>
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
