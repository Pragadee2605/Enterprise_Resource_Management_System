/**
 * Sprint Management Page
 * Create, manage, and plan sprints
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/api';
import { Sprint, Task } from '../types/task';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import './SprintManagement.css';

interface SprintModalData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  goal: string;
}

const SprintManagement: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<SprintModalData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    goal: '',
  });

  useEffect(() => {
    if (projectId) {
      loadSprints();
      loadBacklogTasks();
    }
  }, [projectId]);

  const loadSprints = async () => {
    try {
      const response = await apiService.get('/tasks/sprints/', {
        params: { project: projectId },
      });
      setSprints(response.data.results || response.data.data || []);
    } catch (error) {
      console.error('Failed to load sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBacklogTasks = async () => {
    try {
      const response = await apiService.get('/tasks/tasks/', {
        params: { project: projectId, sprint__isnull: true },
      });
      setBacklogTasks(response.data.results || response.data.data || []);
    } catch (error) {
      console.error('Failed to load backlog:', error);
    }
  };

  const handleCreateSprint = () => {
    setEditingSprint(null);
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      goal: '',
    });
    setShowModal(true);
  };

  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name,
      description: sprint.description,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      goal: sprint.goal || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        project: projectId,
      };

      if (editingSprint) {
        await apiService.put(`/tasks/sprints/${editingSprint.id}/`, data);
      } else {
        await apiService.post('/tasks/sprints/', data);
      }

      setShowModal(false);
      loadSprints();
    } catch (error) {
      console.error('Failed to save sprint:', error);
      alert('Failed to save sprint');
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await apiService.post(`/tasks/sprints/${sprintId}/start_sprint/`);
      loadSprints();
    } catch (error) {
      console.error('Failed to start sprint:', error);
      alert('Failed to start sprint');
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      await apiService.post(`/tasks/sprints/${sprintId}/complete_sprint/`);
      loadSprints();
    } catch (error) {
      console.error('Failed to complete sprint:', error);
      alert('Failed to complete sprint');
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!window.confirm('Are you sure you want to delete this sprint?')) {
      return;
    }

    try {
      await apiService.delete(`/tasks/sprints/${sprintId}/`);
      loadSprints();
    } catch (error) {
      console.error('Failed to delete sprint:', error);
      alert('Failed to delete sprint');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return <Badge variant="secondary">Planned</Badge>;
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'COMPLETED':
        return <Badge variant="info">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="loading">Loading sprints...</div>;
  }

  return (
    <div className="sprint-management">
      <div className="sprint-header">
        <h1>Sprint Management</h1>
        <Button onClick={handleCreateSprint} variant="primary">
          + Create Sprint
        </Button>
      </div>

      <div className="sprints-grid">
        {sprints.map((sprint) => (
          <Card key={sprint.id} className="sprint-card">
            <div className="sprint-card-header">
              <div>
                <h3>{sprint.name}</h3>
                {getStatusBadge(sprint.status)}
              </div>
              <div className="sprint-actions">
                {sprint.status === 'PLANNED' && (
                  <>
                    <Button
                      onClick={() => handleStartSprint(sprint.id)}
                      variant="success"
                      size="small"
                    >
                      Start
                    </Button>
                    <Button
                      onClick={() => handleEditSprint(sprint)}
                      variant="secondary"
                      size="small"
                    >
                      Edit
                    </Button>
                  </>
                )}
                {sprint.status === 'ACTIVE' && (
                  <Button
                    onClick={() => handleCompleteSprint(sprint.id)}
                    variant="info"
                    size="small"
                  >
                    Complete
                  </Button>
                )}
                {sprint.status === 'PLANNED' && (
                  <Button
                    onClick={() => handleDeleteSprint(sprint.id)}
                    variant="danger"
                    size="small"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {sprint.description && (
              <p className="sprint-description">{sprint.description}</p>
            )}

            {sprint.goal && (
              <div className="sprint-goal">
                <strong>Goal:</strong> {sprint.goal}
              </div>
            )}

            <div className="sprint-dates">
              <div>
                <strong>Start:</strong> {new Date(sprint.start_date).toLocaleDateString()}
              </div>
              <div>
                <strong>End:</strong> {new Date(sprint.end_date).toLocaleDateString()}
              </div>
              <div>
                <strong>Duration:</strong> {sprint.duration_days} days
              </div>
            </div>

            <div className="sprint-stats">
              <div className="stat">
                <span className="stat-value">{sprint.task_count}</span>
                <span className="stat-label">Tasks</span>
              </div>
              <div className="stat">
                <span className="stat-value">{sprint.completed_task_count}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {sprint.task_count > 0
                    ? Math.round((sprint.completed_task_count / sprint.task_count) * 100)
                    : 0}
                  %
                </span>
                <span className="stat-label">Progress</span>
              </div>
            </div>
          </Card>
        ))}

        {sprints.length === 0 && (
          <div className="empty-state">
            <p>No sprints yet. Create your first sprint to get started!</p>
          </div>
        )}
      </div>

      <div className="backlog-section">
        <h2>Backlog ({backlogTasks.length} tasks)</h2>
        <div className="backlog-tasks">
          {backlogTasks.map((task) => (
            <Card key={task.id} className="backlog-task-card">
              <div className="task-header">
                <span className="task-title">{task.title}</span>
                {task.issue_type_details && (
                  <span
                    className="issue-badge"
                    style={{ backgroundColor: task.issue_type_details.color }}
                  >
                    {task.issue_type_details.icon}
                  </span>
                )}
              </div>
              <div className="task-meta">
                <Badge variant="secondary">{task.priority}</Badge>
                {task.story_points && (
                  <span className="story-points">{task.story_points} pts</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Sprint Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingSprint ? 'Edit Sprint' : 'Create Sprint'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Sprint Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Sprint Goal</label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={(e) =>
                    setFormData({ ...formData, goal: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <Button type="button" onClick={() => setShowModal(false)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingSprint ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintManagement;
