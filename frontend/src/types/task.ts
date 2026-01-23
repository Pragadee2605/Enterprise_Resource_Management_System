/**
 * Task-related TypeScript interfaces
 */

export interface IssueType {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  name: string;
  description: string;
  project: string;
  project_name: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  start_date: string;
  end_date: string;
  goal: string;
  created_by: string;
  created_by_name: string;
  duration_days: number;
  is_current: boolean;
  task_count: number;
  completed_task_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  task: string;
  file: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  description: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task: string;
  author: string;
  author_name: string;
  author_username: string;
  parent_comment: string | null;
  content: string;
  mentions: string[];
  mentions_details: any[];
  reply_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWatcher {
  id: string;
  task: string;
  user: string;
  user_name: string;
  user_username: string;
  notify_on_comment: boolean;
  notify_on_status_change: boolean;
  notify_on_assignment: boolean;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  task: string;
  user: string;
  user_name: string;
  action: string;
  action_display: string;
  field_name: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  project_name: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_by: string;
  created_by_name: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'COMPLETED';
  estimated_hours: number;
  actual_hours: number;
  hours_variance: number;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  is_overdue: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New fields
  issue_type: number | null;
  issue_type_details: IssueType | null;
  sprint: string | null;
  sprint_details: Sprint | null;
  parent_epic: string | null;
  parent_epic_title: string;
  story_points: number | null;
  kanban_order: number;
  attachments: TaskAttachment[];
  comments_count: number;
  watchers_count: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
}
