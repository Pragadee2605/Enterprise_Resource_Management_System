/**
 * Tasks List Page
 * Task management with Kanban board view
 */
import React, { useState, useEffect } from 'react';
import { taskService } from '../services/dataService';
import { Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Tasks.css';

const TasksList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created' | 'title'>('created');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Fetch tasks assigned to the current user or all accessible tasks
      const response = await taskService.getAll();
      // Ensure tasks is always an array
      const data: any = response.data;
      let tasksArray = Array.isArray(data) ? data : 
                      (Array.isArray(data?.results) ? data.results : 
                      (Array.isArray(data?.data) ? data.data : []));
      
      // If no tasks found, it might mean the endpoint needs specific parameters
      // Try to get user's tasks specifically
      if (tasksArray.length === 0) {
        try {
          const myTasksResponse = await taskService.getMyTasks();
          const myData: any = myTasksResponse.data;
          tasksArray = Array.isArray(myData) ? myData : 
                      (Array.isArray(myData?.results) ? myData.results :
                      (Array.isArray(myData?.data) ? myData.data : []));
        } catch (err) {
          console.log('Could not fetch my tasks, showing empty list');
        }
      }
      
      setTasks(tasksArray);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      // Don't show error for empty results
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to fetch tasks');
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskService.delete(id);
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await taskService.update(taskId, { status: newStatus });
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'TODO': return 'badge-secondary';
      case 'IN_PROGRESS': return 'badge-primary';
      case 'IN_REVIEW': return 'badge-warning';
      case 'COMPLETED': return 'badge-success';
      case 'BLOCKED': return 'badge-danger';
      case 'CANCELLED': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'badge-info';
      case 'MEDIUM': return 'badge-warning';
      case 'HIGH': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  // Filter and sort tasks
  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !task.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Status filter
    if (filterStatus !== 'all' && task.status !== filterStatus) {
      return false;
    }
    // Priority filter
    if (filterPriority !== 'all' && task.priority !== filterPriority) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'due_date':
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case 'priority':
        const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      case 'title':
        return a.title.localeCompare(b.title);
      case 'created':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const tasksByStatus = {
    TODO: filteredTasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    IN_REVIEW: filteredTasks.filter(t => t.status === 'IN_REVIEW'),
    COMPLETED: filteredTasks.filter(t => t.status === 'COMPLETED'),
    BLOCKED: filteredTasks.filter(t => t.status === 'BLOCKED'),
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterPriority('all');
    setSortBy('created');
  };

  const hasActiveFilters = searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || sortBy !== 'created';

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div className="header-left">
          <div className="header-title">
            <h1>Tasks</h1>
            <span className="task-count">{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}</span>
          </div>
          <p className="text-secondary">Manage project tasks and assignments</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
              onClick={() => setViewMode('board')}
              title="Board view"
            >
              ▦
            </button>
          </div>
          {currentUser?.is_admin && (
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/tasks/new')}
            >
              <span>+</span> New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tasks by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>
        
        <div className="filter-controls">
          <select 
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select 
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select 
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="created">Sort: Newest</option>
            <option value="due_date">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>

          {hasActiveFilters && (
            <button className="btn btn-outline btn-small" onClick={handleClearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error!</strong> {error}
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Tasks Found</h3>
          <p>You don't have any tasks assigned yet. Tasks are managed within projects.</p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            Go to Projects
          </button>
        </div>
      )}

      {!loading && tasks.length > 0 && filteredTasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Tasks Match Filters</h3>
          <p>Try adjusting your search or filter criteria.</p>
          <button className="btn btn-outline" onClick={handleClearFilters}>
            Clear All Filters
          </button>
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === 'board' && filteredTasks.length > 0 && (
        <div className="kanban-board">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="kanban-column">
              <div className="kanban-header">
                <h3 className="kanban-title">{status.replace('_', ' ')}</h3>
                <span className="kanban-count">{statusTasks.length}</span>
              </div>
              <div className="kanban-tasks">
                {statusTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="kanban-card"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <div className="task-card-header">
                      <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.task_type && (
                        <span className="task-type-icon" title={task.task_type}>
                          {task.task_type === 'STORY' ? '📖' : 
                           task.task_type === 'BUG' ? '🐛' : 
                           task.task_type === 'TASK' ? '✓' : '⚡'}
                        </span>
                      )}
                    </div>
                    <h4 className="task-title">{task.title}</h4>
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                    <div className="task-meta">
                      {(task.assigned_to_details || task.assignee_details) ? (
                        <div className="task-assignee">
                          <div className="avatar-small">
                            {(task.assigned_to_details?.first_name || task.assignee_details?.first_name || '?')[0]}{(task.assigned_to_details?.last_name || task.assignee_details?.last_name || '?')[0]}
                          </div>
                          <span>{task.assigned_to_details?.first_name || task.assignee_details?.first_name} {task.assigned_to_details?.last_name || task.assignee_details?.last_name}</span>
                        </div>
                      ) : (
                        <div className="task-assignee unassigned">
                          <div className="avatar-small">?</div>
                          <span>Unassigned</span>
                        </div>
                      )}
                      <div className="task-footer">
                        {task.due_date && (
                          <div className={`task-due ${isOverdue(task.due_date) ? 'overdue' : ''}`}>
                            📅 {formatDate(task.due_date)}
                          </div>
                        )}
                        {task.story_points && (
                          <div className="task-points">
                            ⚡ {task.story_points} pts
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="task-actions" onClick={(e) => e.stopPropagation()}>
                      {status !== 'TODO' && (
                        <button 
                          className="btn btn-tiny btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(task.id, getPreviousStatus(status));
                          }}
                          title="Move to previous status"
                        >
                          ←
                        </button>
                      )}
                      <button 
                        className="btn btn-tiny btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}`);
                        }}
                        title="View details"
                      >
                        👁️
                      </button>
                      {status !== 'COMPLETED' && (
                        <button 
                          className="btn btn-tiny btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(task.id, getNextStatus(status));
                          }}
                          title="Move to next status"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredTasks.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => (
                    <tr 
                      key={task.id} 
                      className="task-row"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <td>
                        <div className="task-title-cell">
                          {task.task_type && (
                            <span className="task-type-badge">
                              {task.task_type === 'STORY' ? '📖' : 
                               task.task_type === 'BUG' ? '🐛' : 
                               task.task_type === 'TASK' ? '✓' : '⚡'}
                            </span>
                          )}
                          <div>
                            <strong>{task.title}</strong>
                            {task.story_points && (
                              <span className="story-points-inline">⚡{task.story_points}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {task.project_details?.name ? (
                          <span className="project-badge">{task.project_details.name}</span>
                        ) : '-'}
                      </td>
                      <td>
                        {(task.assigned_to_details || task.assignee_details) ? (
                          <div className="assignee-cell">
                            <div className="avatar-tiny">
                              {(task.assigned_to_details?.first_name || task.assignee_details?.first_name || '?')[0]}{(task.assigned_to_details?.last_name || task.assignee_details?.last_name || '?')[0]}
                            </div>
                            <span>{task.assigned_to_details?.first_name || task.assignee_details?.first_name} {task.assigned_to_details?.last_name || task.assignee_details?.last_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {task.due_date ? (
                          <span className={isOverdue(task.due_date) ? 'text-danger' : ''}>
                            {formatDate(task.due_date)}
                          </span>
                        ) : '-'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-small btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tasks/${task.id}`);
                            }}
                            title="View details"
                          >
                            View
                          </button>
                          {currentUser?.is_admin && (
                            <>
                              <button 
                                className="btn btn-small btn-outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/tasks/${task.id}/edit`);
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                className="btn btn-small btn-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(task.id);
                                }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for status navigation
const getNextStatus = (currentStatus: string): string => {
  const flow = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'IN_REVIEW', IN_REVIEW: 'COMPLETED' };
  return flow[currentStatus as keyof typeof flow] || currentStatus;
};

const getPreviousStatus = (currentStatus: string): string => {
  const flow = { IN_PROGRESS: 'TODO', IN_REVIEW: 'IN_PROGRESS', COMPLETED: 'IN_REVIEW' };
  return flow[currentStatus as keyof typeof flow] || currentStatus;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isOverdue = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export default TasksList;
