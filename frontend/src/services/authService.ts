/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
import { apiService } from './api';
import type {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  APIResponse,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from '../types';

export const authService = {
  /**
   * Login user
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiService.post<LoginResponse>('/auth/login', credentials);
    return response;
  },

  /**
   * Register new user
   */
  register: async (userData: RegisterRequest): Promise<LoginResponse> => {
    const response = await apiService.post<LoginResponse>('/auth/register', userData);
    return response;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<APIResponse<null>> => {
    const response = await apiService.post<APIResponse<null>>('/auth/logout');
    return response;
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<APIResponse<User>> => {
    const response = await apiService.get<APIResponse<User>>('/auth/me');
    return response;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<APIResponse<User>> => {
    const response = await apiService.patch<APIResponse<User>>('/auth/profile', data);
    return response;
  },

  /**
   * Change password
   */
  changePassword: async (data: ChangePasswordRequest): Promise<APIResponse<null>> => {
    const response = await apiService.post<APIResponse<null>>('/auth/change-password', data);
    return response;
  },

  /**
   * Check if user has specific permission
   */
  hasPermission: (user: User | null, permission: string): boolean => {
    if (!user) return false;

    const permissionMap: Record<string, string[]> = {
      ADMIN: [
        'manage_users',
        'manage_departments',
        'manage_projects',
        'manage_tasks',
        'view_all_timesheets',
        'approve_timesheets',
        'generate_reports',
        'view_audit_logs',
        'system_config',
      ],
      EMPLOYEE: [
        'view_own_data',
        'submit_timesheets',
        'view_assigned_projects',
        'manage_projects',
        'manage_tasks',
      ],
    };

    return permissionMap[user.role]?.includes(permission) || false;
  },
};
