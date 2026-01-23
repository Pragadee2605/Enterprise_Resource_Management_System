/**
 * Data Services
 * API integration layer for all CRUD operations
 */
import apiService from './api';
import {
  User,
  Department,
  Project,
  ProjectMember,
  Task,
  Timesheet,
  TimesheetApproval,
  AuditLog,
} from '../types';

// User Service
export const userService = {
  getAll: () => apiService.get<any>('/users/'),
  getById: (id: string | number) => apiService.get<User>(`/users/${id}/`),
  create: (data: any) => apiService.post<User>('/users/', data),
  update: (id: string | number, data: any) => apiService.put<User>(`/users/${id}/`, data),
  delete: (id: string | number) => apiService.delete(`/users/${id}/`),
  activate: (id: string | number) => apiService.post(`/users/${id}/activate/`),
  deactivate: (id: string | number) => apiService.post(`/users/${id}/deactivate/`),
  resetPassword: (id: string | number) => apiService.post(`/users/${id}/reset_password/`),
  updatePassword: (id: string | number, data: { old_password: string; new_password: string }) =>
    apiService.post(`/users/${id}/change_password/`, data),
};

// Department Service
export const departmentService = {
  getAll: () => apiService.get<any>('/departments/'),
  getById: (id: string | number) => apiService.get<Department>(`/departments/${id}/`),
  create: (data: any) => apiService.post<Department>('/departments/', data),
  update: (id: string | number, data: any) => apiService.put<Department>(`/departments/${id}/`, data),
  delete: (id: string | number) => apiService.delete(`/departments/${id}/`),
  activate: (id: string | number) => apiService.post(`/departments/${id}/activate/`),
  deactivate: (id: string | number) => apiService.post(`/departments/${id}/deactivate/`),
  getEmployees: (id: string | number) => apiService.get(`/departments/${id}/employees/`),
};

// Project Service
export const projectService = {
  getAll: (params?: { status?: string; search?: string }) =>
    apiService.get<any>('/projects/', { params }),
  getById: (id: string | number) => apiService.get<Project>(`/projects/${id}/`),
  create: (data: any) => apiService.post<Project>('/projects/', data),
  update: (id: string | number, data: any) => apiService.put<Project>(`/projects/${id}/`, data),
  delete: (id: string | number) => apiService.delete(`/projects/${id}/`),
  getMembers: (id: string | number) => apiService.get<ProjectMember[]>(`/projects/${id}/members/`),
  addMember: (id: string | number, data: any) =>
    apiService.post<ProjectMember>(`/projects/${id}/add_member/`, data),
  removeMember: (projectId: string | number, userId: string | number) =>
    apiService.post(`/projects/${projectId}/remove_member/`, { user_id: userId }),
};

// Task Service
export const taskService = {
  getAll: (params?: {
    project?: number;
    assigned_to?: number;
    status?: string;
    priority?: string;
  }) => apiService.get<any>('/tasks/tasks/', { params }),
  getById: (id: string | number) => apiService.get<Task>(`/tasks/tasks/${id}/`),
  create: (data: any) => apiService.post<Task>('/tasks/tasks/', data),
  update: (id: string | number, data: any) => apiService.put<Task>(`/tasks/tasks/${id}/`, data),
  delete: (id: string | number) => apiService.delete(`/tasks/tasks/${id}/`),
  getMyTasks: () => apiService.get<Task[]>('/tasks/tasks/my_tasks/'),
};

// Timesheet Service
export const timesheetService = {
  getAll: (params?: { status?: string; employee?: number }) =>
    apiService.get<any>('/timesheets/', { params }),
  getById: (id: string | number) => apiService.get<Timesheet>(`/timesheets/${id}/`),
  create: (data: any) => apiService.post<Timesheet>('/timesheets/', data),
  update: (id: string | number, data: any) => apiService.put<Timesheet>(`/timesheets/${id}/`, data),
  delete: (id: string | number) => apiService.delete(`/timesheets/${id}/`),
  submit: (id: string | number) => apiService.post(`/timesheets/${id}/submit/`),
  approve: (id: string | number, data: { status: string; comments?: string }) =>
    apiService.post<TimesheetApproval>(`/timesheets/${id}/approve/`, data),
  getPending: () => apiService.get<Timesheet[]>('/timesheets/pending/'),
  getMyTimesheets: () => apiService.get<Timesheet[]>('/timesheets/my_timesheets/'),
};

// Report Service
export const reportService = {
  getSummary: (filters?: any) =>
    apiService.get<{
      total_users?: number;
      total_departments?: number;
      total_projects?: number;
      total_tasks?: number;
      pending_timesheets?: number;
      active_projects?: number;
      completed_tasks?: number;
      total_hours?: number;
      active_users?: number;
    }>('/reports/summary/', { params: filters }),
  exportProjectReport: (filters: any, format: 'csv' | 'pdf') => {
    const url = `/reports/projects/?format=${format}`;
    return apiService.get(url, { params: filters, responseType: 'blob' });
  },
  exportTimesheetReport: (filters: any) => {
    return apiService.get('/reports/timesheets/', { params: { ...filters, format: 'csv' }, responseType: 'blob' });
  },
  exportWorkloadReport: (filters: any) => {
    return apiService.get('/reports/workload/', { params: { ...filters, format: 'csv' }, responseType: 'blob' });
  },
};

// Audit Service
export const auditService = {
  getAll: (params?: {
    user?: number;
    action?: string;
    model_name?: string;
    start_date?: string;
    end_date?: string;
  }) => apiService.get<any>('/audit/', { params }),
  getById: (id: string | number) => apiService.get<AuditLog>(`/audit/${id}/`),
  export: (params: { format: 'csv' | 'json'; start_date?: string; end_date?: string }) => {
    let url = `/audit/export/?format=${params.format}`;
    if (params.start_date) url += `&start_date=${params.start_date}`;
    if (params.end_date) url += `&end_date=${params.end_date}`;
    return apiService.get(url, { responseType: 'blob' });
  },
};

const dataService = {
  user: userService,
  department: departmentService,
  project: projectService,
  task: taskService,
  timesheet: timesheetService,
  report: reportService,
  audit: auditService,
};

export default dataService;
