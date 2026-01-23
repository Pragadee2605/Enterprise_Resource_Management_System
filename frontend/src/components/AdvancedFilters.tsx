/**
 * Advanced Filters Component
 * Multi-field task filtering
 */
import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import './AdvancedFilters.css';

interface FilterOptions {
  statuses: string[];
  priorities: string[];
  issueTypes: any[];
  sprints: any[];
  users: any[];
}

interface FilterValues {
  status: string[];
  priority: string[];
  issue_type: string[];
  sprint: string[];
  assigned_to: string[];
  search: string;
  due_date_from: string;
  due_date_to: string;
}

interface AdvancedFiltersProps {
  projectId?: string;
  onFilterChange: (filters: any) => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ projectId, onFilterChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [options, setOptions] = useState<FilterOptions>({
    statuses: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED'],
    priorities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    issueTypes: [],
    sprints: [],
    users: [],
  });

  const [filters, setFilters] = useState<FilterValues>({
    status: [],
    priority: [],
    issue_type: [],
    sprint: [],
    assigned_to: [],
    search: '',
    due_date_from: '',
    due_date_to: '',
  });

  useEffect(() => {
    loadFilterOptions();
  }, [projectId]);

  const loadFilterOptions = async () => {
    try {
      const [issueTypesRes, sprintsRes, usersRes] = await Promise.all([
        apiService.get('/tasks/issue-types/'),
        apiService.get('/tasks/sprints/', { params: projectId ? { project: projectId } : {} }),
        apiService.get('/users/'),
      ]);

      setOptions({
        ...options,
        issueTypes: issueTypesRes.data.results || issueTypesRes.data.data || [],
        sprints: sprintsRes.data.results || sprintsRes.data.data || [],
        users: usersRes.data.results || usersRes.data.data || [],
      });
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const handleFilterChange = (field: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    
    // Build query params
    const params: any = {};
    Object.entries(newFilters).forEach(([key, val]) => {
      if (Array.isArray(val) && val.length > 0) {
        params[key] = val.join(',');
      } else if (typeof val === 'string' && val) {
        params[key] = val;
      }
    });

    onFilterChange(params);
  };

  const toggleArrayFilter = (field: keyof FilterValues, value: string) => {
    const currentValues = filters[field] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    
    handleFilterChange(field, newValues);
  };

  const clearFilters = () => {
    const emptyFilters: FilterValues = {
      status: [],
      priority: [],
      issue_type: [],
      sprint: [],
      assigned_to: [],
      search: '',
      due_date_from: '',
      due_date_to: '',
    };
    setFilters(emptyFilters);
    onFilterChange({});
  };

  const activeFilterCount = Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) return count + value.length;
    if (typeof value === 'string' && value) return count + 1;
    return count;
  }, 0);

  return (
    <div className="advanced-filters">
      <div className="filters-header">
        <button
          className="toggle-filters-btn"
          onClick={() => setExpanded(!expanded)}
        >
          🔍 Filters
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear All
          </button>
        )}
      </div>

      {expanded && (
        <div className="filters-panel">
          {/* Search */}
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>

          {/* Status */}
          <div className="filter-group">
            <label>Status</label>
            <div className="filter-options">
              {options.statuses.map((status) => (
                <button
                  key={status}
                  className={`filter-chip ${
                    filters.status.includes(status) ? 'active' : ''
                  }`}
                  onClick={() => toggleArrayFilter('status', status)}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="filter-group">
            <label>Priority</label>
            <div className="filter-options">
              {options.priorities.map((priority) => (
                <button
                  key={priority}
                  className={`filter-chip priority-${priority.toLowerCase()} ${
                    filters.priority.includes(priority) ? 'active' : ''
                  }`}
                  onClick={() => toggleArrayFilter('priority', priority)}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Type */}
          <div className="filter-group">
            <label>Issue Type</label>
            <div className="filter-options">
              {options.issueTypes.map((type) => (
                <button
                  key={type.id}
                  className={`filter-chip ${
                    filters.issue_type.includes(type.id) ? 'active' : ''
                  }`}
                  onClick={() => toggleArrayFilter('issue_type', type.id)}
                >
                  {type.icon} {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sprint */}
          <div className="filter-group">
            <label>Sprint</label>
            <select
              value={filters.sprint[0] || ''}
              onChange={(e) =>
                handleFilterChange('sprint', e.target.value ? [e.target.value] : [])
              }
              className="filter-select"
            >
              <option value="">All Sprints</option>
              {options.sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} ({sprint.status})
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="filter-group">
            <label>Assignee</label>
            <select
              value={filters.assigned_to[0] || ''}
              onChange={(e) =>
                handleFilterChange('assigned_to', e.target.value ? [e.target.value] : [])
              }
              className="filter-select"
            >
              <option value="">All Users</option>
              {options.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date Range */}
          <div className="filter-group">
            <label>Due Date</label>
            <div className="date-range">
              <input
                type="date"
                value={filters.due_date_from}
                onChange={(e) => handleFilterChange('due_date_from', e.target.value)}
                className="date-input"
              />
              <span>to</span>
              <input
                type="date"
                value={filters.due_date_to}
                onChange={(e) => handleFilterChange('due_date_to', e.target.value)}
                className="date-input"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;
