/**
 * Task Comments Component
 * Comments thread with @mentions support
 */
import React, { useEffect, useState } from 'react';
import { MentionsInput, Mention } from 'react-mentions';
import apiService from '../services/api';
import { TaskComment } from '../types/task';
import Button from '../components/common/Button';
import './TaskComments.css';

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface TaskCommentsProps {
  taskId: string;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
    loadUsers();
  }, [taskId]);

  const loadComments = async () => {
    try {
      const response = await apiService.get('/tasks/comments/', {
        params: { task: taskId, top_level_only: 'true' },
      });
      setComments(response.data.results || response.data.data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.get('/users/');
      setUsers(response.data.results || response.data.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    try {
      // Extract mentioned user IDs
      const mentionRegex = /@\[([^\]]+)\]\((\w+)\)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push(match[2]);
      }

      const data = {
        task: taskId,
        content: newComment,
        mentions,
        parent_comment: replyingTo,
      };

      await apiService.post('/tasks/comments/', data);
      setNewComment('');
      setReplyingTo(null);
      loadComments();
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Failed to post comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await apiService.delete(`/tasks/comments/${commentId}/`);
      loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatMentions = (content: string) => {
    return content.replace(/@\[([^\]]+)\]\(\w+\)/g, '<span class="mention">@$1</span>');
  };

  const userSuggestions = users.map((user) => ({
    id: user.id,
    display: user.username,
  }));

  if (loading) {
    return <div className="comments-loading">Loading comments...</div>;
  }

  return (
    <div className="task-comments">
      <h3>Comments ({comments.length})</h3>

      <form onSubmit={handleSubmit} className="comment-form">
        {replyingTo && (
          <div className="replying-to">
            Replying to comment
            <button type="button" onClick={() => setReplyingTo(null)}>
              Cancel
            </button>
          </div>
        )}

        <MentionsInput
          value={newComment}
          onChange={(e: any) => setNewComment(e.target.value)}
          placeholder="Write a comment... Use @ to mention someone"
          className="mentions-input"
        >
          <Mention
            trigger="@"
            data={userSuggestions}
            className="mentions__mention"
            displayTransform={(id: string, display: string) => `@${display}`}
          />
        </MentionsInput>

        <div className="comment-actions">
          <Button type="submit" variant="primary" size="small" disabled={!newComment.trim()}>
            Post Comment
          </Button>
        </div>
      </form>

      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <div className="comment-author">
                <div className="author-avatar">
                  {comment.author_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{comment.author_name}</strong>
                  <span className="comment-time">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={() => handleDelete(comment.id)}
                title="Delete comment"
              >
                ×
              </button>
            </div>

            <div
              className="comment-content"
              dangerouslySetInnerHTML={{ __html: formatMentions(comment.content) }}
            />

            {comment.mentions_details.length > 0 && (
              <div className="mentioned-users">
                Mentioned: {comment.mentions_details.map((u: any) => u.username).join(', ')}
              </div>
            )}

            {comment.reply_count > 0 && (
              <div className="reply-info">{comment.reply_count} replies</div>
            )}

            <button
              className="reply-btn"
              onClick={() => setReplyingTo(comment.id)}
            >
              Reply
            </button>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="no-comments">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskComments;
