/**
 * Timesheet Form Page
 * Full-page form for creating/editing timesheets
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { timesheetService, projectService, taskService } from '../services/dataService';
import { Project, Task, Timesheet } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './Timesheets.css';

const TimesheetForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const preSelectedProjectId = searchParams.get('project');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project: preSelectedProjectId || '',
    task: '',
    hours: '',
    description: '',
  });

  useEffect(() => {
    fetchProjects();
    if (id) {
      fetchTimesheet();
    }
  }, [id]);

  useEffect(() => {
    if (formData.project) {
      fetchTasks(formData.project);
    } else {
      setTasks([]);
    }
  }, [formData.project]);

  const fetchProjects = async () => {
    try {
      const response = await projectService.getAll();
      const projectsData = response.data.results || response.data;
      setProjects(projectsData.filter((p: Project) => p.status === 'ACTIVE'));
    } catch (err: any) {
      showToast('Failed to load projects', 'error');
    }
  };

  const fetchTasks = async (projectId: string) => {
    try {
      const response = await taskService.getAll();
      const tasksData = response.data.results || response.data;
      setTasks(tasksData.filter((t: Task) => 
        t.project === projectId && t.status !== 'COMPLETED'
      ));
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setTasks([]);
    }
  };

  const fetchTimesheet = async () => {
    try {
      setLoading(true);
      const response = await timesheetService.getById(id!);
      const data = response.data || response;
      setTimesheet(data);
      setFormData({
        date: data.date,
        project: data.project,
        task: data.task || '',
        hours: data.hours.toString(),
        description: data.description || '',
      });
    } catch (err: any) {
      showToast('Failed to load timesheet', 'error');
      navigate('/timesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const submitData = {
        ...formData,
        employee: currentUser?.id,
      };
      
      if (id) {
        await timesheetService.update(id, submitData);
        showToast('Timesheet updated successfully', 'success');
      } else {
        await timesheetService.create(submitData);
        showToast('Timesheet created successfully', 'success');
      }
      navigate('/timesheets');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save timesheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getProjectName = () => {
    if (!preSelectedProjectId) return null;
    const project = projects.find(p => p.id === preSelectedProjectId);
    return project?.name || null;
  };

  if (loading && id) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading timesheet...</p>
      </div>
    );
  }

  return (
    <div className="timesheets-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{id ? 'Edit Timesheet' : 'Log Work Hours'}</h1>
          <p className="text-secondary">
            {id ? 'Update your timesheet entry' : 'Record time spent on projects and tasks'}
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/timesheets')}
        >
          ← Back to Timesheets
        </button>
      </div>

      {/* Info Banner */}
      {preSelectedProjectId && getProjectName() && !id && (
        <div className="alert" style={{ 
          background: '#dbeafe', 
          border: '1px solid #3b82f6', 
          color: '#1e40af',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
          <span>
            <strong>Project Selected:</strong> {getProjectName()}
          </span>
        </div>
      )}

      {/* Form Card */}
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-body" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Date Field */}
              <div className="form-group">
                <label className="form-label form-label-required">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
                <small className="text-secondary">Select the date you worked</small>
              </div>

              {/* Project Field */}
              <div className="form-group">
                <label className="form-label form-label-required">Project</label>
                <select
                  className="form-select"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value, task: '' })}
                  required
                >
                  <option value="">Select project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} {project.department_details?.name ? `(${project.department_details.name})` : ''}
                    </option>
                  ))}
                </select>
                {projects.length === 0 && (
                  <small className="text-secondary">No active projects available</small>
                )}
              </div>

              {/* Task Field */}
              <div className="form-group">
                <label className="form-label">Task (Optional)</label>
                <select
                  className="form-select"
                  value={formData.task}
                  onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                  disabled={!formData.project}
                >
                  <option value="">Select task (optional)...</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title} - {task.status}
                    </option>
                  ))}
                </select>
                {!formData.project && (
                  <small className="text-secondary">Select a project first</small>
                )}
                {formData.project && tasks.length === 0 && (
                  <small className="text-secondary">No tasks available for this project</small>
                )}
              </div>

              {/* Hours Field */}
              <div className="form-group">
                <label className="form-label form-label-required">Hours</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  required
                  min="0.5"
                  max="24"
                  step="0.5"
                  placeholder="e.g., 8.0"
                />
                <small className="text-secondary">Enter hours in 0.5 increments (0.5 - 24)</small>
              </div>

              {/* Description Field */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  placeholder="What did you work on? Be specific about your accomplishments..."
                  style={{ resize: 'vertical' }}
                />
                <small className="text-secondary">Describe the work you completed (optional but recommended)</small>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'flex-end',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/timesheets')}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (id ? 'Update Timesheet' : 'Save as Draft')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimesheetForm;
