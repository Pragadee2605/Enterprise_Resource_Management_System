/**
 * Create/Edit Project Page
 * Any authenticated user can create projects (Jira architecture)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectService, departmentService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import './Projects.css';

interface ProjectFormData {
  name: string;
  code?: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  budget?: number;
  department?: string;
}

interface Department {
  id: number;
  name: string;
}

const ProjectsNew: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    code: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'PLANNING',
    budget: undefined,
    department: undefined,
  });

  // Check if user is authenticated (Jira architecture: any authenticated user can create projects)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      console.log('ProjectsNew - Not authenticated, redirecting to login');
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load departments
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await departmentService.getAll();
      const deptList = response.data || response;
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  // Load project data in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadProjectData();
    }
  }, [isEditMode, id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const response = await projectService.getById(id!);
      const project = response.data || response;
      setFormData({
        name: project.name || '',
        code: project.code || '',
        description: project.description || '',
        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
        end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
        status: project.status || 'PLANNING',
        budget: project.budget || undefined,
        department: (project.department as any)?.id?.toString() || project.department?.toString() || undefined,
      });
    } catch (err: any) {
      console.error('Failed to load project:', err);
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? (value ? parseFloat(value) : undefined) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('ProjectsNew - Form submit:', formData);

    // Validation
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Project description is required');
      return;
    }

    if (!formData.department) {
      setError('Department is required');
      return;
    }

    if (!formData.end_date) {
      setError('End date is required');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date must be after start date');
      return;
    }

    try {
      setLoading(true);
      console.log(`ProjectsNew - ${isEditMode ? 'Updating' : 'Creating'} project...`, formData);
      
      // Remove empty code field to let backend auto-generate
      const submitData = { ...formData };
      if (!submitData.code || submitData.code.trim() === '') {
        delete submitData.code;
      }
      
      if (isEditMode) {
        const result = await projectService.update(id!, submitData);
        console.log('ProjectsNew - Project updated:', result);
        navigate(`/projects/${id}`);
      } else {
        const result = await projectService.create(submitData);
        console.log('ProjectsNew - Project created:', result);
        navigate('/projects');
      }
    } catch (err: any) {
      console.error(`ProjectsNew - Error ${isEditMode ? 'updating' : 'creating'} project:`, err);
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} project`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  console.log('ProjectsNew - Rendering page');

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>{isEditMode ? 'Edit Project' : 'Create New Project'}</h1>
          <p className="text-secondary">{isEditMode ? 'Update project details' : 'Define a new project for your team'}</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error!</strong> {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="name">
                Project Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter project name"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="description">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the project objectives and scope"
                rows={4}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">
                Start Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_date">
                End Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                min={formData.start_date}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">
                Status <span className="required">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="department">
                Department <span className="required">*</span>
              </label>
              <select
                id="department"
                name="department"
                value={formData.department || ''}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="budget">Budget (Optional)</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget || ''}
                onChange={handleChange}
                placeholder="Enter budget amount"
                min="0"
                step="0.01"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(isEditMode ? `/projects/${id}` : '/projects')}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Project' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectsNew;
