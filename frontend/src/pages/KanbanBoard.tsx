/**
 * Kanban Board Component - Drag and Drop Task Management
 * Complete rewrite with clean drag and drop functionality
 */
import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Task, IssueType, Sprint } from '../types/task';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CreateTaskModal from '../components/CreateTaskModal';
import './KanbanBoard.css';

interface KanbanData {
  TODO: Task[];
  IN_PROGRESS: Task[];
  IN_REVIEW: Task[];
  BLOCKED: Task[];
  COMPLETED: Task[];
}

const statusColumns = [
  { id: 'TODO', title: 'To Do', color: '#6b7280' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: '#3b82f6' },
  { id: 'IN_REVIEW', title: 'In Review', color: '#f59e0b' },
  { id: 'BLOCKED', title: 'Blocked', color: '#ef4444' },
  { id: 'COMPLETED', title: 'Completed', color: '#10b981' },
];

const KanbanBoard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [kanbanData, setKanbanData] = useState<KanbanData>({
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    BLOCKED: [],
    COMPLETED: [],
  });
  
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadIssueTypes();
      loadSprints();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadKanbanData();
    }
  }, [projectId, selectedSprint]);

  const loadKanbanData = async () => {
    try {
      setLoading(true);
      const params: any = { project: projectId };
      if (selectedSprint) {
        params.sprint = selectedSprint;
      }

      const response = await apiService.get('/tasks/tasks/kanban/', { params });
      const data = response.data.data || response.data;
      
      const kanbanTasks = {
        TODO: data?.TODO || [],
        IN_PROGRESS: data?.IN_PROGRESS || [],
        IN_REVIEW: data?.IN_REVIEW || [],
        BLOCKED: data?.BLOCKED || [],
        COMPLETED: data?.COMPLETED || [],
      };
      
      setKanbanData(kanbanTasks);
    } catch (error) {
      console.error('Failed to load Kanban data:', error);
      setKanbanData({
        TODO: [],
        IN_PROGRESS: [],
        IN_REVIEW: [],
        BLOCKED: [],
        COMPLETED: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIssueTypes = async () => {
    try {
      const response = await apiService.get('/tasks/issue-types/');
      const types = response.data.results || response.data.data || response.data || [];
      setIssueTypes(Array.isArray(types) ? types : []);
    } catch (error) {
      console.error('Failed to load issue types:', error);
      setIssueTypes([]);
    }
  };

  const loadSprints = async () => {
    try {
      const response = await apiService.get('/tasks/sprints/', {
        params: { project: projectId },
      });
      setSprints(response.data.results || response.data.data || []);
    } catch (error) {
      console.error('Failed to load sprints:', error);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) {
      return;
    }

    // Dropped in same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColumnId = source.droppableId as keyof KanbanData;
    const destColumnId = destination.droppableId as keyof KanbanData;

    // Create new state
    const newKanbanData = { ...kanbanData };
    const sourceTasks = Array.from(newKanbanData[sourceColumnId]);
    const [movedTask] = sourceTasks.splice(source.index, 1);

    if (sourceColumnId === destColumnId) {
      // Moving within same column
      sourceTasks.splice(destination.index, 0, movedTask);
      newKanbanData[sourceColumnId] = sourceTasks;
    } else {
      // Moving to different column
      const destTasks = Array.from(newKanbanData[destColumnId]);
      destTasks.splice(destination.index, 0, movedTask);
      newKanbanData[sourceColumnId] = sourceTasks;
      newKanbanData[destColumnId] = destTasks;
    }

    // Optimistically update UI
    setKanbanData(newKanbanData);

    // Update on server
    try {
      await apiService.post(`/tasks/tasks/${draggableId}/reorder/`, {
        kanban_order: destination.index,
        status: destColumnId,
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on error
      loadKanbanData();
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="kanban-loading">
        <div className="spinner"></div>
        <p>Loading Kanban board...</p>
      </div>
    );
  }

  return (
    <div className="kanban-board">
      <div className="kanban-header">
        <h1>Kanban Board</h1>
        <div className="kanban-controls">
          {sprints.length > 0 && (
            <select
              value={selectedSprint}
              onChange={(e) => setSelectedSprint(e.target.value)}
              className="sprint-filter"
            >
              <option value="">All Tasks</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} ({sprint.status})
                </option>
              ))}
            </select>
          )}
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            + Create Task
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-columns">
          {statusColumns.map((column) => (
            <div key={column.id} className="kanban-column">
              <div className="column-header" style={{ borderTopColor: column.color }}>
                <h3>{column.title}</h3>
                <span className="task-count">
                  {(kanbanData[column.id as keyof KanbanData] || []).length}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {(kanbanData[column.id as keyof KanbanData] || []).map((task, index) => (
                      <Draggable 
                        key={String(task.id)} 
                        draggableId={String(task.id)} 
                        index={index}
                        isDragDisabled={false}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            style={{
                              ...provided.draggableProps.style,
                              cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                            }}
                            onClick={(e) => {
                              if (!snapshot.isDragging) {
                                handleTaskClick(task.id);
                              }
                            }}
                          >
                            <div className="task-card-header">
                              <div className="task-title">{task.title}</div>
                              {task.issue_type_details && (
                                <span
                                  className="issue-type-badge"
                                  style={{ backgroundColor: task.issue_type_details.color }}
                                  title={task.issue_type_details.name}
                                >
                                  {task.issue_type_details.icon}
                                </span>
                              )}
                            </div>

                            {task.description && (
                              <p className="task-description">
                                {task.description.substring(0, 100)}
                                {task.description.length > 100 ? '...' : ''}
                              </p>
                            )}

                            <div className="task-card-footer">
                              <div className="task-meta">
                                <Badge variant={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                {task.story_points && (
                                  <span className="story-points">
                                    {task.story_points} pts
                                  </span>
                                )}
                              </div>

                              <div className="task-icons">
                                {task.attachments?.length > 0 && (
                                  <span className="icon-badge">📎 {task.attachments.length}</span>
                                )}
                                {task.comments_count > 0 && (
                                  <span className="icon-badge">💬 {task.comments_count}</span>
                                )}
                              </div>

                              {task.assigned_to_name && (
                                <div className="assignee-avatar" title={task.assigned_to_name}>
                                  {getInitials(task.assigned_to_name)}
                                </div>
                              )}
                            </div>

                            {task.is_overdue && (
                              <div className="overdue-indicator">OVERDUE</div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {kanbanData[column.id as keyof KanbanData].length === 0 && (
                      <div className="empty-column">
                        <p>No tasks</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={loadKanbanData}
        projectId={projectId || ''}
        sprints={sprints}
        issueTypes={issueTypes}
      />
    </div>
  );
};

export default KanbanBoard;
