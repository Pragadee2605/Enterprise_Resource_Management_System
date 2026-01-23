/**
 * Projects List Page
 * Project portfolio management
 */
import React, { useState, useEffect } from 'react';
import { projectService } from '../services/dataService';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Projects.css';

const ProjectsList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('ALL');

  // Fetch projects on mount and when returning to this page
  useEffect(() => {
    if (location.pathname === '/projects') {
      fetchProjects();
    }
  }, [location.pathname]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response: any = await projectService.getAll();
      
      // Handle different response structures (array, paginated, or wrapped)
      let items: any[] = [];
      if (Array.isArray(response)) {
        items = response;
      } else if (response && Array.isArray(response.results)) {
        items = response.results;
      } else if (response && Array.isArray(response.data)) {
        items = response.data;
      }
      
      setProjects(items);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setError(err.response?.data?.message || 'Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectService.delete(id);
      fetchProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'badge-info';
      case 'ACTIVE': return 'badge-primary';
      case 'ON_HOLD': return 'badge-warning';
      case 'COMPLETED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const filteredProjects = projects.filter(project => 
    filter === 'ALL' || project.status === filter
  );

  const calculateProgress = (project: Project) => {
    if (!project.total_tasks) return 0;
    return Math.round((project.completed_tasks || 0) / project.total_tasks * 100);
  };

  const formatBudget = (budget: number | string | undefined) => {
    if (!budget) return '$0';
    const num = typeof budget === 'string' ? parseFloat(budget) : budget;
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="text-secondary">Manage project portfolio</p>
        </div>
        {currentUser && (
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/projects/new')}
          >
            <span>+</span> New Project
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error!</strong> {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All Projects ({projects.length})
        </button>
        <button 
          className={`filter-tab ${filter === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setFilter('ACTIVE')}
        >
          Active ({projects.filter(p => p.status === 'ACTIVE').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'PLANNING' ? 'active' : ''}`}
          onClick={() => setFilter('PLANNING')}
        >
          Planning ({projects.filter(p => p.status === 'PLANNING').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setFilter('COMPLETED')}
        >
          Completed ({projects.filter(p => p.status === 'COMPLETED').length})
        </button>
      </div>

      {/* Projects Grid */}
      <div className="projects-grid">
        {filteredProjects.map(project => {
          const progress = calculateProgress(project);
          return (
            <div key={project.id} className="card project-card">
              <div className="card-body">
                <div className="project-header">
                  <h3 className="project-title">{project.name}</h3>
                  <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}

                {/* Progress Bar */}
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-label">Progress</span>
                    <span className="progress-value">{progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Project Stats */}
                <div className="project-stats">
                  <div className="stat-item">
                    <div className="stat-label">Budget</div>
                    <div className="stat-value">
                      {formatBudget(project.budget)}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Tasks</div>
                    <div className="stat-value">
                      {project.completed_tasks || 0}/{project.total_tasks || 0}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Team</div>
                    <div className="stat-value">{project.member_count || 0}</div>
                  </div>
                </div>

                {/* Dates */}
                <div className="project-dates">
                  <div className="date-item">
                    <span className="date-label">Start:</span>
                    <span className="date-value">
                      {new Date(project.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  {project.end_date && (
                    <div className="date-item">
                      <span className="date-label">End:</span>
                      <span className="date-value">
                        {new Date(project.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="card-footer">
                  <button 
                    className="btn btn-small btn-primary"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    View Details
                  </button>
                  <button 
                    className="btn btn-small btn-outline"
                    onClick={() => navigate(`/timesheets?project=${project.id}`)}
                    title="Log hours for this project"
                  >
                    ⏱️ Log Hours
                  </button>
                  {(currentUser?.role === 'ADMIN' || project.manager === currentUser?.id) && (
                    <>
                      <button 
                        className="btn btn-small btn-outline"
                        onClick={() => navigate(`/projects/${project.id}/edit`)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(project.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="empty-state">
          <p>No projects found</p>
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
