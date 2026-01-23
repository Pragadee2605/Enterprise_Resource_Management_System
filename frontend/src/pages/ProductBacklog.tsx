/**
 * Product Backlog Page
 * Jira-style backlog management with sprint planning
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Sprint, Task, IssueType } from '../types/task';
import CreateTaskModal from '../components/CreateTaskModal';
import './ProductBacklog.css';

interface SprintWithTasks extends Sprint {
  tasks: Task[];
}

const ProductBacklog: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [sprints, setSprints] = useState<SprintWithTasks[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [sprintForm, setSprintForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    goal: '',
  });

  useEffect(() => {
    if (projectId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadSprints(),
      loadBacklogTasks(),
      loadIssueTypes(),
    ]);
    setLoading(false);
  };

  const loadSprints = async () => {
    try {
      const response = await apiService.get('/tasks/sprints/', {
        params: { project: projectId },
      });
      console.log('Full sprint API response:', response.data);
      const sprintsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || response.data.data || []);
      console.log('Loaded sprints:', sprintsData);
      console.log('Number of sprints:', sprintsData.length);
      setAllSprints(sprintsData);

      // Load tasks for each sprint
      const sprintsWithTasks = await Promise.all(
        sprintsData.map(async (sprint: Sprint) => {
          const tasksResponse = await apiService.get('/tasks/tasks/', {
            params: { project: projectId, sprint: sprint.id },
          });
          return {
            ...sprint,
            tasks: tasksResponse.data.results || tasksResponse.data.data || [],
          };
        })
      );

      setSprints(sprintsWithTasks);
      // Expand active and planned sprints by default
      const expanded = new Set(
        sprintsWithTasks
          .filter((s) => s.status === 'ACTIVE' || s.status === 'PLANNED')
          .map((s) => s.id)
      );
      setExpandedSprints(expanded);
    } catch (error) {
      console.error('Failed to load sprints:', error);
    }
  };

  const loadBacklogTasks = async () => {
    try {
      const response = await apiService.get('/tasks/tasks/', {
        params: { project: projectId, sprint__isnull: true },
      });
      const tasks = Array.isArray(response.data)
        ? response.data
        : (response.data.results || response.data.data || []);
      setBacklogTasks(tasks);
    } catch (error) {
      console.error('Failed to load backlog:', error);
    }
  };

  const loadIssueTypes = async () => {
    try {
      const response = await apiService.get('/tasks/issue-types/');
      const types = Array.isArray(response.data)
        ? response.data
        : (response.data.results || response.data.data || []);
      setIssueTypes(types);
    } catch (error) {
      console.error('Failed to load issue types:', error);
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.post('/tasks/sprints/', {
        ...sprintForm,
        project: projectId,
      });
      setShowCreateSprint(false);
      setSprintForm({ name: '', start_date: '', end_date: '', goal: '' });
      loadData();
    } catch (error) {
      console.error('Failed to create sprint:', error);
      alert('Failed to create sprint');
    }
  };

  const handleMoveToSprint = async (taskId: string, sprintId: string) => {
    try {
      await apiService.patch(`/tasks/tasks/${taskId}/`, {
        sprint: sprintId || null,
      });
      loadData();
    } catch (error) {
      console.error('Failed to move task:', error);
      alert('Failed to move task');
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await apiService.post(`/tasks/sprints/${sprintId}/start_sprint/`);
      loadData();
    } catch (error) {
      console.error('Failed to start sprint:', error);
    }
  };

  const toggleSprint = (sprintId: string) => {
    const newExpanded = new Set(expandedSprints);
    if (newExpanded.has(sprintId)) {
      newExpanded.delete(sprintId);
    } else {
      newExpanded.add(sprintId);
    }
    setExpandedSprints(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return '#6b7280';
      case 'IN_PROGRESS': return '#3b82f6';
      case 'IN_REVIEW': return '#f59e0b';
      case 'BLOCKED': return '#ef4444';
      case 'COMPLETED': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f59e0b';
      case 'MEDIUM': return '#3b82f6';
      case 'LOW': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const renderTaskRow = (task: Task, showSprintColumn: boolean = false) => (
    <tr key={task.id} className="task-row">
      <td className="task-key">
        <span className="task-id">#{task.id.slice(0, 8)}</span>
      </td>
      <td className="task-type">
        {task.issue_type_details && (
          <span
            className="type-badge"
            style={{ backgroundColor: task.issue_type_details.color }}
            title={task.issue_type_details.name}
          >
            {task.issue_type_details.icon}
          </span>
        )}
      </td>
      <td className="task-summary">
        <div 
          className="task-title" 
          onClick={() => navigate(`/tasks/${task.id}`)}
          style={{ cursor: 'pointer' }}
        >
          {task.title}
        </div>
        {task.description && (
          <div className="task-description">{task.description.slice(0, 100)}</div>
        )}
      </td>
      <td className="task-status">
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(task.status) }}
        >
          {task.status.replace('_', ' ')}
        </span>
      </td>
      <td className="task-priority">
        <span
          className="priority-badge"
          style={{ color: getPriorityColor(task.priority) }}
        >
          {task.priority}
        </span>
      </td>
      <td className="task-story-points">
        {task.story_points && (
          <span className="story-points-badge">{task.story_points}</span>
        )}
      </td>
      <td className="task-assignee">
        {task.assigned_to_name && (
          <div className="assignee-avatar" title={task.assigned_to_name}>
            {task.assigned_to_name.charAt(0).toUpperCase()}
          </div>
        )}
      </td>
      {showSprintColumn && (
        <td className="task-sprint-move">
          <select
            value={task.sprint || ''}
            onChange={(e) => handleMoveToSprint(task.id, e.target.value)}
            className="sprint-select"
          >
            <option value="">Move to...</option>
            {sprints
              .filter((s) => s.status !== 'COMPLETED')
              .map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
          </select>
        </td>
      )}
    </tr>
  );

  if (loading) {
    return <div className="loading">Loading backlog...</div>;
  }

  return (
    <div className="product-backlog">
      <div className="backlog-header">
        <div>
          <h1>Product Backlog</h1>
          <p className="subtitle">Plan and manage your sprints and tasks</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowCreateSprint(true)}>
            + Create Sprint
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateTask(true)}>
            + Create Task
          </button>
        </div>
      </div>

      {/* Sprints Section */}
      <div className="sprints-section">
        {sprints.map((sprint) => (
          <div key={sprint.id} className={`sprint-container sprint-${sprint.status.toLowerCase()}`}>
            <div className="sprint-header">
              <div className="sprint-info">
                <button
                  className="sprint-toggle"
                  onClick={() => toggleSprint(sprint.id)}
                >
                  {expandedSprints.has(sprint.id) ? '▼' : '▶'}
                </button>
                <h3>{sprint.name}</h3>
                <span className={`sprint-status status-${sprint.status.toLowerCase()}`}>
                  {sprint.status}
                </span>
                <span className="sprint-dates">
                  {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                </span>
                <span className="sprint-tasks-count">
                  {sprint.tasks.length} issues
                  {sprint.tasks.length > 0 && `, ${sprint.tasks.reduce((sum, task) => sum + (task.story_points || 0), 0)} points`}
                </span>
              </div>
              <div className="sprint-actions">
                {sprint.status === 'PLANNED' && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleStartSprint(sprint.id)}
                  >
                    Start Sprint
                  </button>
                )}
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => navigate(`/sprints/${projectId}`)}
                >
                  Manage
                </button>
              </div>
            </div>

            {expandedSprints.has(sprint.id) && (
              <div className="sprint-tasks">
                {sprint.tasks.length > 0 ? (
                  <table className="tasks-table">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Type</th>
                        <th>Summary</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Points</th>
                        <th>Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sprint.tasks.map((task) => renderTaskRow(task, false))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-sprint">
                    <p>No tasks in this sprint. Drag tasks from backlog to add them.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Backlog Section */}
      <div className="backlog-container">
        <div className="backlog-header-section">
          <h2>Backlog</h2>
          <span className="backlog-count">{backlogTasks.length} issues</span>
        </div>

        {backlogTasks.length > 0 ? (
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Type</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Points</th>
                <th>Assignee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backlogTasks.map((task) => renderTaskRow(task, true))}
            </tbody>
          </table>
        ) : (
          <div className="empty-backlog">
            <p>No tasks in backlog. Create your first task to get started!</p>
          </div>
        )}
      </div>

      {/* Create Sprint Modal */}
      {showCreateSprint && (
        <div className="modal-overlay" onClick={() => setShowCreateSprint(false)}>
          <div className="modal-content create-sprint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Sprint</h2>
              <button className="close-button" onClick={() => setShowCreateSprint(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSprint}>
              <div className="form-group">
                <label>Sprint Name *</label>
                <input
                  type="text"
                  value={sprintForm.name}
                  onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                  placeholder="Sprint 1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Sprint Goal</label>
                <input
                  type="text"
                  value={sprintForm.goal}
                  onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                  placeholder="What is the goal of this sprint?"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={sprintForm.start_date}
                    onChange={(e) => setSprintForm({ ...sprintForm, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={sprintForm.end_date}
                    onChange={(e) => setSprintForm({ ...sprintForm, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateSprint(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onTaskCreated={loadData}
        projectId={projectId || ''}
        sprints={allSprints}
        issueTypes={issueTypes}
      />
    </div>
  );
};

export default ProductBacklog;
