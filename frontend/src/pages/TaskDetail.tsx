/**
 * Task Detail Page
 * Comprehensive view of task with comments, attachments, watchers, history
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Task } from '../types/task';
import { useToast } from '../contexts/ToastContext';
import './TaskDetail.css';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments' | 'history'>('details');
  const [isWatching, setIsWatching] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sprints, setSprints] = useState<any[]>([]);
  const [updatingSprint, setUpdatingSprint] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  
  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTaskDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);
  
  useEffect(() => {
    if (taskId) {
      if (activeTab === 'comments') {
        loadComments();
      } else if (activeTab === 'attachments') {
        loadAttachments();
      } else if (activeTab === 'history') {
        loadHistory();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, activeTab]);

  const loadTaskDetails = async () => {
    try {
      const response = await apiService.get(`/tasks/tasks/${taskId}/`);
      const taskData = response.data;
      setTask(taskData);
      
      // Load sprints for the task's project
      if (taskData.project) {
        loadSprints(taskData.project);
      }
      
      // Check if current user is watching
      const watchStatus = await apiService.get(`/tasks/tasks/${taskId}/is_watching/`);
      setIsWatching(watchStatus.data.is_watching);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSprints = async (projectId: string) => {
    try {
      const response = await apiService.get('/tasks/sprints/', {
        params: { project: projectId }
      });
      const sprintsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || response.data.data || []);
      setSprints(sprintsData);
    } catch (error) {
      console.error('Failed to load sprints:', error);
      setSprints([]);
    }
  };

  const handleWatch = async () => {
    try {
      if (isWatching) {
        await apiService.post(`/tasks/tasks/${taskId}/unwatch/`);
        toast.success('You have stopped watching this task');
      } else {
        await apiService.post(`/tasks/tasks/${taskId}/watch/`);
        toast.success('You are now watching this task');
      }
      setIsWatching(!isWatching);
    } catch (error: any) {
      console.error('Failed to toggle watch:', error);
      toast.error(error.response?.data?.message || 'Failed to update watch status');
    }
  };

  const loadProjectMembers = async () => {
    try {
      const response = await apiService.get(`/tasks/tasks/${taskId}/project_members/`);
      const membersData = response.data?.data || response.data || [];
      setProjectMembers(membersData);
    } catch (error: any) {
      console.error('Failed to load project members:', error);
      toast.error('Failed to load project members');
      setProjectMembers([]);
    }
  };
  
  // Comments functions
  const loadComments = async () => {
    try {
      const response = await apiService.get('/tasks/comments/', {
        params: { task: taskId, top_level_only: 'true' }
      });
      const commentsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || response.data.data || []);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    }
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setAddingComment(true);
      const payload: any = {
        task: taskId,
        content: newComment
      };
      
      if (replyTo) {
        payload.parent_comment = replyTo;
      }
      
      await apiService.post('/tasks/comments/', payload);
      toast.success(replyTo ? 'Reply added' : 'Comment added');
      setNewComment('');
      setReplyTo(null);
      loadComments();
      // Update task to refresh comment count
      loadTaskDetails();
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };
  
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await apiService.delete(`/tasks/comments/${commentId}/`);
      toast.success('Comment deleted');
      loadComments();
      loadTaskDetails();
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };
  
  // Attachments functions
  const loadAttachments = async () => {
    try {
      const response = await apiService.get('/tasks/attachments/', {
        params: { task: taskId }
      });
      const attachmentsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || response.data.data || []);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      toast.error('Failed to load attachments');
    }
  };
  
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    try {
      setUploading(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('task', taskId!);
        formData.append('file_name', file.name);
        
        await apiService.post('/tasks/attachments/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      toast.success(`${files.length} file(s) uploaded successfully`);
      loadAttachments();
      loadTaskDetails();
    } catch (error: any) {
      console.error('Failed to upload files:', error);
      toast.error(error.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      await apiService.delete(`/tasks/attachments/${attachmentId}/`);
      toast.success('Attachment deleted');
      loadAttachments();
      loadTaskDetails();
    } catch (error: any) {
      console.error('Failed to delete attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };
  
  // History functions
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await apiService.get('/tasks/history/', {
        params: { task: taskId }
      });
      const historyData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || response.data.data || []);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAssignToMe = async () => {
    try {
      setAssigning(true);
      toast.info('Assigning task to you...');
      const response = await apiService.post(`/tasks/tasks/${taskId}/assign_to_me/`);
      const updatedTask = response.data?.data || response.data;
      setTask(updatedTask);
      toast.success('Task successfully assigned to you!');
    } catch (error: any) {
      console.error('Failed to assign task:', error);
      toast.error(error.response?.data?.message || 'Failed to assign task');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssign = async (userId: string) => {
    try {
      setAssigning(true);
      toast.info('Assigning task...');
      const response = await apiService.post(`/tasks/tasks/${taskId}/assign/`, {
        user_id: userId
      });
      const updatedTask = response.data?.data || response.data;
      setTask(updatedTask);
      setShowAssignModal(false);
      toast.success(`Task assigned to ${updatedTask.assigned_to_name || 'user'}!`);
    } catch (error: any) {
      console.error('Failed to assign task:', error);
      toast.error(error.response?.data?.message || 'Failed to assign task');
    } finally {
      setAssigning(false);
    }
  };


  const handleSprintChange = async (newSprintId: string) => {
    try {
      setUpdatingSprint(true);
      toast.info('Updating sprint...');
      const response = await apiService.patch(`/tasks/tasks/${taskId}/`, {
        sprint: newSprintId || null
      });
      const updatedTask = response.data?.data || response.data;
      setTask(updatedTask);
      const sprintName = sprints.find(s => s.id === newSprintId)?.name || 'No Sprint';
      toast.success(`Sprint changed to ${sprintName}`);
    } catch (error: any) {
      console.error('Failed to update sprint:', error);
      toast.error(error.response?.data?.message || 'Failed to update sprint');
    } finally {
      setUpdatingSprint(false);
    }
  };
  const openAssignModal = async () => {
    setShowAssignModal(true);
    await loadProjectMembers();
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      toast.info('Updating task status...');
      const response = await apiService.post(`/tasks/tasks/${taskId}/update_status/`, {
        status: newStatus
      });
      const updatedTask = response.data?.data || response.data;
      setTask(updatedTask);
      toast.success(`Status changed to ${newStatus.replace('_', ' ')}`);
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading task...</div>;
  }

  if (!task) {
    return <div className="error">Task not found</div>;
  }

  return (
    <div className="task-detail-page">
      <div className="task-detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="task-header-actions">
          <button className="btn btn-secondary" onClick={handleWatch}>
            {isWatching ? '👁️ Watching' : '👁️ Watch'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleAssignToMe}
            disabled={assigning}
          >
            👤 Assign to Me
          </button>
          <button 
            className="btn btn-primary" 
            onClick={openAssignModal}
            disabled={assigning}
          >
            👥 Assign
          </button>
          <button className="btn btn-secondary">Edit</button>
        </div>
      </div>

      <div className="task-detail-content">
        <div className="task-main">
          <div className="task-title-section">
            <h1>{task.title}</h1>
            {task.issue_type_details && (
              <span
                className="issue-badge"
                style={{ backgroundColor: task.issue_type_details.color }}
              >
                {task.issue_type_details.icon} {task.issue_type_details.name}
              </span>
            )}
          </div>

          <div className="task-tabs">
            <button
              className={`tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments ({task.comments_count || 0})
            </button>
            <button
              className={`tab ${activeTab === 'attachments' ? 'active' : ''}`}
              onClick={() => setActiveTab('attachments')}
            >
              Attachments ({task.attachments?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'details' && (
              <div className="details-panel">
                <div className="description-section">
                  <h3>Description</h3>
                  <p>{task.description || 'No description provided'}</p>
                </div>
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="comments-panel">
                <div className="comment-form">
                  {replyTo && (
                    <div className="reply-banner">
                      <span>Replying to comment...</span>
                      <button onClick={() => setReplyTo(null)} className="btn-cancel-reply">
                        Cancel
                      </button>
                    </div>
                  )}
                  <textarea
                    className="comment-input"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <button
                    className="btn-add-comment"
                    onClick={handleAddComment}
                    disabled={addingComment || !newComment.trim()}
                  >
                    {addingComment ? 'Adding...' : replyTo ? 'Reply' : 'Add Comment'}
                  </button>
                </div>
                
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p className="no-data">No comments yet. Be the first to comment!</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-avatar">
                          {comment.author_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <span className="comment-author">{comment.author_name}</span>
                            <span className="comment-date">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="comment-text">{comment.content}</div>
                          <div className="comment-actions">
                            <button 
                              className="btn-comment-action"
                              onClick={() => setReplyTo(comment.id)}
                            >
                              Reply
                            </button>
                            <button 
                              className="btn-comment-action delete"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              Delete
                            </button>
                            {comment.reply_count > 0 && (
                              <span className="reply-count">
                                {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="attachments-panel">
                <div 
                  className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-upload" className="upload-label">
                    {uploading ? (
                      <span>Uploading...</span>
                    ) : (
                      <>
                        <span className="upload-icon">📁</span>
                        <span>Drag & drop files here or click to browse</span>
                      </>
                    )}
                  </label>
                </div>
                
                <div className="attachments-list">
                  {attachments.length === 0 ? (
                    <p className="no-data">No attachments yet.</p>
                  ) : (
                    attachments.map((attachment) => (
                      <div key={attachment.id} className="attachment-item">
                        <div className="attachment-icon">📎</div>
                        <div className="attachment-info">
                          <div className="attachment-name">{attachment.file_name}</div>
                          <div className="attachment-meta">
                            <span>{(attachment.file_size / 1024).toFixed(2)} KB</span>
                            <span>•</span>
                            <span>Uploaded by {attachment.uploaded_by_name}</span>
                            <span>•</span>
                            <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="attachment-actions">
                          <a 
                            href={attachment.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-attachment-action"
                            download
                          >
                            Download
                          </a>
                          <button 
                            className="btn-attachment-action delete"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-panel">
                {loadingHistory ? (
                  <p className="loading">Loading history...</p>
                ) : history.length === 0 ? (
                  <p className="no-data">No history available.</p>
                ) : (
                  <div className="history-timeline">
                    {history.map((entry) => (
                      <div key={entry.id} className="history-entry">
                        <div className="history-marker"></div>
                        <div className="history-content">
                          <div className="history-header">
                            <span className="history-user">{entry.user_name}</span>
                            <span className="history-action">{entry.action_display}</span>
                          </div>
                          {entry.field_name && (
                            <div className="history-details">
                              <strong>{entry.field_name}:</strong>
                              {entry.old_value && (
                                <span className="old-value">
                                  {entry.old_value}
                                </span>
                              )}
                              <span className="arrow">→</span>
                              <span className="new-value">
                                {entry.new_value}
                              </span>
                            </div>
                          )}
                          <div className="history-date">
                            {new Date(entry.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="task-sidebar">
          <div className="sidebar-section">
            <h4>Status</h4>
            <select
              className="status-select"
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              style={{ backgroundColor: getStatusColor(task.status) }}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="BLOCKED">Blocked</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="sidebar-section">
            <h4>Sprint</h4>
            <select
              className="status-select"
              value={task.sprint || ''}
              onChange={(e) => handleSprintChange(e.target.value)}
              disabled={updatingSprint}
            >
              <option value="">No Sprint</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} {sprint.status !== 'ACTIVE' ? `(${sprint.status})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="sidebar-section">
            <h4>Priority</h4>
            <span className="priority-badge" style={{ color: getPriorityColor(task.priority) }}>
              {task.priority}
            </span>
          </div>

          <div className="sidebar-section">
            <h4>Assignee</h4>
            {task.assigned_to_name ? (
              <div className="assignee-info">
                <div className="assignee-avatar">
                  {task.assigned_to_name.charAt(0).toUpperCase()}
                </div>
                <span>{task.assigned_to_name}</span>
              </div>
            ) : (
              <span className="text-muted">Unassigned</span>
            )}
          </div>

          {task.story_points && (
            <div className="sidebar-section">
              <h4>Story Points</h4>
              <span className="story-points">{task.story_points}</span>
            </div>
          )}

          {task.due_date && (
            <div className="sidebar-section">
              <h4>Due Date</h4>
              <span>{new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}

          <div className="sidebar-section">
            <h4>Created</h4>
            <span>{new Date(task.created_at).toLocaleDateString()}</span>
          </div>

          <div className="sidebar-section">
            <h4>Updated</h4>
            <span>{new Date(task.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Task</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-subtitle">Select a team member to assign this task to:</p>
              <div className="members-list">
                {projectMembers.length === 0 ? (
                  <p className="text-muted">Loading project members...</p>
                ) : (
                  projectMembers.map((member) => (
                    <div
                      key={member.id}
                      className="member-item"
                      onClick={() => handleAssign(member.id)}
                      style={{ cursor: assigning ? 'not-allowed' : 'pointer' }}
                    >
                      <div className="member-avatar">
                        {member.first_name?.charAt(0).toUpperCase()}
                        {member.last_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="member-info">
                        <div className="member-name">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="member-email">{member.email}</div>
                      </div>
                      {task?.assigned_to === member.id && (
                        <span className="current-assignee-badge">Current</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

export default TaskDetail;
