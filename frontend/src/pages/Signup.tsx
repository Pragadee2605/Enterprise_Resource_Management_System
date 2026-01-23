import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import './Login.css'; // Reusing Login.css for consistent styling

interface SignupFormData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  country_code: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    country_code: '+1',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);

  const COUNTRY_CODES = [
    { code: '+1', country: 'US' },
    { code: '+44', country: 'UK' },
    { code: '+91', country: 'India' },
    { code: '+86', country: 'China' },
    { code: '+81', country: 'Japan' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+39', country: 'Italy' },
    { code: '+34', country: 'Spain' },
    { code: '+61', country: 'Australia' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear specific field error when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Password confirmation validation
    if (!formData.password_confirm) {
      newErrors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }

    // Phone number validation (optional but if provided, validate format)
    if (formData.phone_number && !/^\d{7,15}$/.test(formData.phone_number.replace(/[\s-]/g, ''))) {
      newErrors.phone_number = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Combine country code and phone number
      const fullPhoneNumber = formData.phone_number 
        ? `${formData.country_code} ${formData.phone_number}`.trim()
        : '';

      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: fullPhoneNumber,
      });

      if (response.success && response.data) {
        // Update user in context
        updateUser(response.data.user);
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setErrors({ general: response.message || 'Registration failed' });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle backend validation errors
      if (error.response?.data?.errors) {
        const backendErrors: Record<string, string> = {};
        Object.keys(error.response.data.errors).forEach(key => {
          const errorMessages = error.response.data.errors[key];
          backendErrors[key] = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: error.response?.data?.message || 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Create Account</h1>
          <p>Sign up to get started with ERMS</p>
        </div>

        {errors.general && (
          <div className="alert alert-error">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={errors.first_name ? 'error' : ''}
                placeholder="John"
              />
              {errors.first_name && (
                <span className="error-message">{errors.first_name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="last_name">
                Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={errors.last_name ? 'error' : ''}
                placeholder="Doe"
              />
              {errors.last_name && (
                <span className="error-message">{errors.last_name}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">Phone Number (Optional)</label>
            <div className="phone-input-row">
              <select
                name="country_code"
                value={formData.country_code}
                onChange={handleChange}
                className="country-code-select"
              >
                {COUNTRY_CODES.map(({ code, country }) => (
                  <option key={code} value={code}>
                    {code} ({country})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className={errors.phone_number ? 'error' : ''}
                placeholder="1234567890"
              />
            </div>
            {errors.phone_number && (
              <span className="error-message">{errors.phone_number}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder="••••••••"
            />
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
            <small className="form-help">
              Must be at least 8 characters with uppercase, lowercase, and numbers
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password_confirm">
              Confirm Password <span className="required">*</span>
            </label>
            <input
              type="password"
              id="password_confirm"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              className={errors.password_confirm ? 'error' : ''}
              placeholder="••••••••"
            />
            {errors.password_confirm && (
              <span className="error-message">{errors.password_confirm}</span>
            )}
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="login-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
