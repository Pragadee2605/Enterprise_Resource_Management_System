/**
 * Create Task Modal Component
 * Modal for creating new tasks in a project
 */
import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import { IssueType, Sprint } from '../types/task';
import './CreateTaskModal.css';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  projectId: string;
  sprints: Sprint[];
  issueTypes: IssueType[];
}

interface TaskFormData {
  title: string;
  description: string;
  issue_type: string;
  priority: string;
  status: string;
  sprint: string;
  assigned_to: string;
  story_points: number;
  due_date: string;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  projectId,
  sprints,
  issueTypes,
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    issue_type: '',
    priority: 'MEDIUM',
    status: 'TODO',
    sprint: '',
    assigned_to: '',
    story_points: 1,
    due_date: '',
  });
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectMembers();
      console.log('Modal opened - issueTypes:', issueTypes);
      console.log('Modal opened - sprints:', sprints);
      console.log('Modal opened - sprints length:', sprints?.length);
      console.log('Modal opened - sprints is array?', Array.isArray(sprints));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  const loadProjectMembers = async () => {
    try {
      const response = await apiService.get(`/projects/${projectId}/`);
      const members = response.data.data?.members || response.data.members || [];
      setProjectMembers(members);
    } catch (error) {
      console.error('Failed to load project members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        project: projectId,
        sprint: formData.sprint || null,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
      };

      await apiService.post('/tasks/tasks/', payload);
      onTaskCreated();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Failed to create task:', error);
      setError(error.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      issue_type: '',
      priority: 'MEDIUM',
      status: 'TODO',
      sprint: '',
      assigned_to: '',
      story_points: 1,
      due_date: '',
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Task</h2>
          <button className="close-button" onClick={handleClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {(!issueTypes || issueTypes.length === 0) && (
            <div className="info-message">
              ⚠️ No issue types available. Please contact administrator.
            </div>
          )}

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="title">
                Task Title <span className="required">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="Enter task title"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                placeholder="Enter task description"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="issue_type">
                Issue Type <span className="required">*</span>
              </label>
              <select
                id="issue_type"
                value={formData.issue_type}
                onChange={(e) =>
                  setFormData({ ...formData, issue_type: e.target.value })
                }
                required
              >
                <option value="">Select Type</option>
                {issueTypes && issueTypes.length > 0 ? (
                  issueTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No issue types available</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">
                Priority <span className="required">*</span>
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                required
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">
                Status <span className="required">*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                required
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="story_points">Story Points</label>
              <input
                id="story_points"
                type="number"
                min="1"
                max="100"
                value={formData.story_points}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    story_points: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sprint">Sprint</label>
              <select
                id="sprint"
                value={formData.sprint}
                onChange={(e) =>
                  setFormData({ ...formData, sprint: e.target.value })
                }
              >
                <option value="">No Sprint</option>
                {sprints && sprints.length > 0 ? (
                  sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.status})
                    </option>
                  ))
                ) : (
                  <option disabled>No sprints available - Create one first</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="assigned_to">Assign To</label>
              <select
                id="assigned_to"
                value={formData.assigned_to}
                onChange={(e) =>
                  setFormData({ ...formData, assigned_to: e.target.value })
                }
              >
                <option value="">Unassigned</option>
                {projectMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user_name} ({member.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="due_date">Due Date</label>
              <input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={handleClose}
              className="button button-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
