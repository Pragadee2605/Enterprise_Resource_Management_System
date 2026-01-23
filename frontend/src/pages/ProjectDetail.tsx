/**
 * Project Detail Page
 * Comprehensive view of project information, members, and tasks
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/dataService';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import AddMembersModal from '../components/AddMembersModal';
import ManageInvitationsModal from '../components/ManageInvitationsModal';
import './Projects.css';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showManageInvitations, setShowManageInvitations] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await projectService.getById(id!);
      const data = response.data || response;
      setProject(data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.response?.data?.message || 'Failed to fetch project details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    try {
      await projectService.delete(id!);
      navigate('/projects');
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

  const calculateProgress = () => {
    if (!project?.total_tasks) return 0;
    return Math.round((project.completed_tasks || 0) / project.total_tasks * 100);
  };

  const formatBudget = (budget: number | string | undefined) => {
    if (!budget) return '$0';
    const num = typeof budget === 'string' ? parseFloat(budget) : budget;
    return `$${num.toLocaleString()}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canEdit = currentUser?.role === 'ADMIN' || project?.manager === currentUser?.id;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="projects-page">
        <div className="alert alert-danger">
          <strong>Error!</strong> {error || 'Project not found'}
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
          Back to Projects
        </button>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="projects-page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem' }}>{project.name}</h1>
            <span className={`badge ${getStatusBadgeClass(project.status)}`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>
            {project.code} • {project.department_name || 'No Department'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-small" onClick={() => navigate('/projects')}>
            ← Back
          </button>
          <button 
            className="btn btn-primary btn-small"
            onClick={() => navigate(`/timesheets?project=${id}`)}
            title="Log hours for this project"
          >
            ⏱️ Log Hours
          </button>
          {canEdit && (
            <>
              <button 
                className="btn btn-outline btn-small"
                onClick={() => navigate(`/projects/${id}/edit`)}
              >
                Edit
              </button>
              <button 
                className="btn btn-danger btn-small"
                onClick={handleDelete}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Description Card */}
          <div className="card">
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: '600', color: '#111827' }}>
                Description
              </h3>
              <p style={{ lineHeight: '1.6', color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                {project.description || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Progress Card */}
          <div className="card">
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600', color: '#111827' }}>
                Progress Overview
              </h3>
              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Task Completion</span>
                  <span className="progress-value">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div style={{ 
                  marginTop: '0.75rem', 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{project.completed_tasks || 0} completed</span>
                  <span>{(project.total_tasks || 0) - (project.completed_tasks || 0)} pending</span>
                  <span>{project.total_tasks || 0} total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="card">
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '600', color: '#111827' }}>
                  Tasks & Board
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => navigate(`/backlog/${id}`)}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    📋 Backlog
                  </button>
                  <button 
                    className="btn btn-primary btn-small"
                    onClick={() => navigate(`/kanban/${id}`)}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    Open Kanban →
                  </button>
                </div>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '1rem',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2563eb' }}>
                    {project.total_tasks || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    TOTAL
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#059669' }}>
                    {project.completed_tasks || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    COMPLETED
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ea580c' }}>
                    {(project.total_tasks || 0) - (project.completed_tasks || 0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    PENDING
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Section */}
          <div className="card">
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '600', color: '#111827' }}>
                  Team Members
                </h3>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-outline btn-small" 
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => setShowAddMembers(true)}
                    >
                      Invite Members
                    </button>
                    <button 
                      className="btn btn-outline btn-small" 
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => setShowManageInvitations(true)}
                    >
                      Manage Invitations
                    </button>
                  </div>
                )}
              </div>
              <div style={{ 
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: '600', color: '#2563eb' }}>
                  {project.member_count || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Active team members
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Stats Card */}
          <div className="card">
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600', color: '#111827' }}>
                Project Stats
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ 
                  padding: '0.75rem',
                  background: '#f0fdf4',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#15803d', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                    BUDGET
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#15803d' }}>
                    {formatBudget(project.budget)}
                  </div>
                </div>
                <div style={{ 
                  padding: '0.75rem',
                  background: '#eff6ff',
                  borderRadius: '6px',
                  border: '1px solid #bfdbfe'
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#1e40af', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                    TEAM SIZE
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e40af' }}>
                    {project.member_count || 0}
                  </div>
                </div>
                <div style={{ 
                  padding: '0.75rem',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#92400e', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                    PROGRESS
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#92400e' }}>
                    {progress}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="card">
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600', color: '#111827' }}>
                Timeline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ 
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                    START DATE
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '500', color: '#374151' }}>
                    {formatDate(project.start_date)}
                  </div>
                </div>
                <div style={{ 
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                    END DATE
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '500', color: '#374151' }}>
                    {formatDate(project.end_date)}
                  </div>
                </div>
                {project.is_overdue && (
                  <div style={{ 
                    padding: '0.75rem',
                    background: '#fef2f2',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    fontSize: '0.875rem',
                    color: '#991b1b',
                    fontWeight: '500'
                  }}>
                    ⚠️ Project is overdue
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Manager Card */}
          <div className="card">
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600', color: '#111827' }}>
                Project Manager
              </h3>
              <div style={{ 
                padding: '0.75rem',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.25rem', color: '#111827' }}>
                  {project.manager_name || 'Unknown'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                  Project Lead
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Members Modal */}
      {showAddMembers && (
        <AddMembersModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowAddMembers(false)}
          onSuccess={fetchProject}
        />
      )}

      {/* Manage Invitations Modal */}
      {showManageInvitations && (
        <ManageInvitationsModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowManageInvitations(false)}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
