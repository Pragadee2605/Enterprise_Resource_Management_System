/**
 * Dashboard Page
 * Main dashboard with statistics and overview and analytics charts
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import PendingInvitations from '../components/PendingInvitations';
import apiService from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

interface DashboardStats {
  total_users: number;
  total_departments: number;
  total_projects: number;
  total_tasks: number;
  pending_timesheets: number;
  active_projects: number;
  completed_tasks: number;
}

interface ChartData {
  issueDistribution: { name: string; value: number; }[];
  sprintVelocity: { name: string; completed: number; }[];
  taskTrend: { date: string; completed: number; created: number; }[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_departments: 0,
    total_projects: 0,
    total_tasks: 0,
    pending_timesheets: 0,
    active_projects: 0,
    completed_tasks: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    issueDistribution: [],
    sprintVelocity: [],
    taskTrend: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    fetchChartData();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await apiService.get('/reports/summary/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      // Fetch issue type distribution
      const issueTypesRes = await apiService.get('/tasks/tasks/', {
        params: { page_size: 1000 },
      });
      const tasks = issueTypesRes.data.results || [];
      
      const issueTypeCounts: { [key: string]: number } = {};
      tasks.forEach((task: any) => {
        const typeName = task.issue_type_name || 'TASK';
        issueTypeCounts[typeName] = (issueTypeCounts[typeName] || 0) + 1;
      });

      const issueDistribution = Object.entries(issueTypeCounts).map(([name, value]) => ({
        name,
        value,
      }));

      // Fetch sprint velocity
      const sprintsRes = await apiService.get('/tasks/sprints/', {
        params: { status: 'COMPLETED', page_size: 10 },
      });
      const sprints = sprintsRes.data.results || [];
      
      const sprintVelocity = sprints.map((sprint: any) => ({
        name: sprint.name,
        completed: sprint.completed_story_points || 0,
      }));

      // Mock task trend data (you can implement proper tracking)
      const taskTrend = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          completed: Math.floor(Math.random() * 10) + 5,
          created: Math.floor(Math.random() * 8) + 3,
        };
      });

      setChartData({
        issueDistribution,
        sprintVelocity,
        taskTrend,
      });
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: JSX.Element;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <Card padding="medium">
      <div className="stat-card">
        <div className={`stat-icon stat-icon-${color}`}>{icon}</div>
        <div className="stat-content">
          <div className="stat-title">{title}</div>
          <div className="stat-value">{loading ? '...' : value}</div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, {user?.first_name}! <Badge variant="success">{user?.role}</Badge>
          </p>
        </div>
      </div>

      {/* Pending Invitations */}
      <PendingInvitations />

      <div className="stats-grid">
        {user?.role === 'ADMIN' && (
          <StatCard
            title="Total Users"
            value={stats.total_users}
            color="blue"
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
          />
        )}

        {user?.role === 'ADMIN' && (
          <StatCard
            title="Departments"
            value={stats.total_departments}
            color="purple"
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            }
          />
        )}

        <StatCard
          title="Active Projects"
          value={stats.active_projects}
          color="green"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />

        <StatCard
          title="Total Tasks"
          value={stats.total_tasks}
          color="orange"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
        />

        <StatCard
          title="Completed Tasks"
          value={stats.completed_tasks}
          color="teal"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        {user?.role === 'ADMIN' && (
          <StatCard
            title="Pending Timesheets"
            value={stats.pending_timesheets}
            color="red"
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        )}
      </div>

      <div className="dashboard-grid">
        <Card title="Quick Actions" padding="medium">
          <div className="quick-actions">
            <a href="/projects" className="action-link">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Project
            </a>
            <a href="/tasks" className="action-link">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add New Task
            </a>
            <a href="/timesheets" className="action-link">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Submit Timesheet
            </a>
            <a href="/reports" className="action-link">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View Reports
            </a>
          </div>
        </Card>

        <Card title="Recent Activity" padding="medium">
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon activity-icon-blue">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="activity-content">
                <div className="activity-title">System initialized</div>
                <div className="activity-time">Just now</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="charts-section">
        <h2 className="section-title">Analytics</h2>
        
        <div className="charts-grid">
          {/* Issue Type Distribution */}
          <Card title="Issue Type Distribution" padding="medium">
            {chartData.issueDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.issueDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.issueDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No data available</div>
            )}
          </Card>

          {/* Sprint Velocity */}
          <Card title="Sprint Velocity" padding="medium">
            {chartData.sprintVelocity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.sprintVelocity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#3b82f6" name="Completed Story Points" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No sprint data available</div>
            )}
          </Card>

          {/* Task Trend */}
          <Card title="Task Trend (Last 7 Days)" padding="medium">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.taskTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
