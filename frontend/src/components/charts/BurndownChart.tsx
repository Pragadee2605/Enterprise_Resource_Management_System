/**
 * Burn-down Chart Component
 * Sprint burn-down visualization
 */
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api';
import './BurndownChart.css';

interface BurndownChartProps {
  sprintId: string;
}

interface BurndownData {
  date: string;
  ideal: number;
  actual: number;
}

const BurndownChart: React.FC<BurndownChartProps> = ({ sprintId }) => {
  const [data, setData] = useState<BurndownData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBurndownData();
  }, [sprintId]);

  const loadBurndownData = async () => {
    try {
      const response = await apiService.get(`/tasks/sprints/${sprintId}/burndown/`);
      const burndownData = response.data;

      // Format data for recharts
      const formattedData = burndownData.dates.map((date: string, index: number) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ideal: burndownData.ideal_line[index],
        actual: burndownData.actual_line[index],
      }));

      setData(formattedData);
    } catch (error) {
      console.error('Failed to load burndown data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="burndown-loading">Loading burn-down chart...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="burndown-empty">
        <p>No burn-down data available for this sprint</p>
      </div>
    );
  }

  return (
    <div className="burndown-chart">
      <h3>Sprint Burn-down Chart</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#9ca3af"
            strokeDasharray="5 5"
            name="Ideal Burn-down"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Actual Progress"
            dot={{ fill: '#3b82f6', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BurndownChart;
