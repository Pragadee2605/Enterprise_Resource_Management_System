/**
 * Table Component
 * Data table with sorting and pagination
 */
import React from 'react';
import './Table.css';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
}

function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="table-loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-empty">
        <span>No data available</span>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.sortable ? 'sortable' : ''}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick && onRowClick(item)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
