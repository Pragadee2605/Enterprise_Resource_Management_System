/**
 * TypeScript type definitions for ERMS frontend
 */

// User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  phone_number?: string;
  employee_id?: string;
  department?: string;
  department_name?: string;
  department_id?: string;
  department_details?: { name: string; code: string };
  is_active: boolean;
  is_admin?: boolean;
  has_usable_password?: boolean;
  date_joined: string;
  last_login?: string;
  updated_at?: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    session_id: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

// Department types
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  manager?: string;
  manager_name?: string;
  manager_details?: { first_name: string; last_name: string };
  employee_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  start_date: string;
  end_date?: string;
  budget?: number;
  department?: string;
  department_name?: string;
  department_details?: { name: string };
  manager: string;
  manager_name?: string;
  member_count?: number;
  team_size?: number;
  task_count?: number;
  total_tasks?: number;
  completed_tasks?: number;
  progress_percentage?: number;
  is_overdue?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Project Member types
export interface ProjectMember {
  id?: string;
  project: string;
  user: string;
  role?: string;
  joined_date?: string;
  user_details?: { first_name: string; last_name: string; email: string };
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  task_type?: 'STORY' | 'BUG' | 'TASK' | 'EPIC';
  story_points?: number;
  project: string;
  project_name?: string;
  project_details?: { id: string; name: string; code?: string };
  assigned_to?: string;
  assignee?: string;
  assigned_to_name?: string;
  assignee_details?: { id: string; first_name: string; last_name: string; email: string };
  assigned_to_details?: { id: string; first_name: string; last_name: string; email: string };
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

// Timesheet types
export interface Timesheet {
  id: string;
  user: string;
  employee?: string;
  employee_details?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  user_name?: string;
  project: string;
  project_name?: string;
  project_details?: { name: string };
  task?: string;
  task_title?: string;
  task_details?: { title: string };
  date: string;
  work_date?: string;
  hours: number;
  hours_worked?: number;
  description?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TimesheetApproval {
  id: number;
  timesheet: string;
  approved_by: string;
  approved_by_name?: string;
  status: 'APPROVED' | 'REJECTED';
  comments?: string;
  approved_at: string;
}

// Audit log types
export interface AuditLog {
  id: number | string;
  user?: string | number;
  user_name?: string;
  user_details?: { first_name: string; last_name: string };
  action: string;
  entity_type?: string;
  model_name?: string;
  entity_id?: string;
  object_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

// API response types
export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  defaultValue?: any;
}

// Table types
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}

// Context types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

// Report types
export interface Report {
  type: 'project-progress' | 'employee-workload' | 'timesheet-summary';
  format: 'json' | 'csv' | 'pdf';
  filters: Record<string, any>;
  generated_at?: string;
  data?: any;
}

// Dashboard types
export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  pending_tasks: number;
  pending_timesheets: number;
  total_users: number;
}

// Chart types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}
