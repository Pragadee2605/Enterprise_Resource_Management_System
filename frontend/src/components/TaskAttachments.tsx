/**
 * Task Attachments Component
 * File upload and attachment management
 */
import React, { useEffect, useState, useRef } from 'react';
import apiService from '../services/api';
import { TaskAttachment } from '../types/task';
import Button from '../components/common/Button';
import './TaskAttachments.css';

interface TaskAttachmentsProps {
  taskId: string;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ taskId }) => {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  const loadAttachments = async () => {
    try {
      const response = await apiService.get('/tasks/attachments/', {
        params: { task: taskId },
      });
      setAttachments(response.data.results || response.data.data || []);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('task', taskId);
        formData.append('description', '');

        await apiService.post('/tasks/attachments/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      loadAttachments();
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return;

    try {
      await apiService.delete(`/tasks/attachments/${attachmentId}/`);
      loadAttachments();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
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
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📎';
  };

  return (
    <div className="task-attachments">
      <h3>Attachments ({attachments.length})</h3>

      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />
        <div className="upload-icon">📁</div>
        <p>
          {uploading ? 'Uploading...' : 'Drag & drop files here or click to browse'}
        </p>
        <span className="upload-hint">Support for all file types</span>
      </div>

      <div className="attachments-list">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="attachment-item">
            <div className="attachment-icon">
              {getFileIcon(attachment.file_type)}
            </div>
            <div className="attachment-info">
              <div className="attachment-name">{attachment.file_name}</div>
              <div className="attachment-meta">
                {formatFileSize(attachment.file_size)} • {attachment.uploaded_by_name} •{' '}
                {new Date(attachment.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="attachment-actions">
              <a
                href={attachment.file_url}
                download
                className="download-btn"
                title="Download"
              >
                ⬇️
              </a>
              <button
                onClick={() => handleDelete(attachment.id)}
                className="delete-btn"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {attachments.length === 0 && !uploading && (
          <div className="no-attachments">
            <p>No attachments yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskAttachments;
