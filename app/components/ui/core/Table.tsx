'use client';

import React, { forwardRef, type HTMLAttributes, type ReactNode, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  selection?: {
    selectedKeys: string[];
    onSelectionChange: (keys: string[]) => void;
  };
}

function TableHeader<T>({ 
  columns, 
  sortColumn, 
  sortDirection, 
  onSort,
  selection,
  className 
}: { 
  columns: Column<T>[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  selection?: TableProps<T>['selection'];
  className?: string;
}) {
  return (
    <thead className={clsx('[&_tr]:border-b [&_tr]:border-gray-200 dark:[&_tr]:border-gray-700', className)}>
      <tr>
        {selection && (
          <th className="w-12 px-4 py-3">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={selection.selectedKeys.length === columns.length && columns.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  selection.onSelectionChange(columns.map(c => c.key));
                } else {
                  selection.onSelectionChange([]);
                }
              }}
            />
          </th>
        )}
        {columns.map((column) => (
          <th
            key={column.key}
            className={clsx(
              'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
              column.headerClassName,
              column.sortable && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none'
            )}
            style={{ width: column.width, textAlign: column.align }}
            onClick={() => column.sortable && onSort?.(column.key)}
          >
            <div className="flex items-center gap-1.5">
              {column.header}
              {column.sortable && (
                <span className="inline-flex">
                  {sortColumn === column.key ? (
                    sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  ) : (
                    <ChevronDown size={12} className="text-gray-300 dark:text-gray-600" />
                  )}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableBody<T>({ 
  columns, 
  data, 
  keyExtractor, 
  hoverable, 
  striped,
  onRowClick,
  selection,
  compact,
  className 
}: { 
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  hoverable?: boolean;
  striped?: boolean;
  onRowClick?: (row: T) => void;
  selection?: TableProps<T>['selection'];
  compact?: boolean;
  className?: string;
}) {
  if (data.length === 0) {
    return (
      <tbody className={className}>
        <tr>
          <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
            데이터가 없습니다.
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className={className}>
      {data.map((row, rowIndex) => {
        const rowKey = keyExtractor(row);
        const isSelected = selection?.selectedKeys.includes(rowKey);
        return (
          <tr
            key={rowKey}
            className={clsx(
              'transition-colors',
              hoverable && 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
              striped && rowIndex % 2 === 1 && 'bg-gray-50 dark:bg-gray-800/50',
              isSelected && 'bg-primary-50 dark:bg-primary-900/20',
              onRowClick && 'cursor-pointer',
              compact && 'py-2'
            )}
            onClick={() => onRowClick?.(row)}
          >
            {selection && (
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newKeys = e.target.checked
                      ? [...selection.selectedKeys, rowKey]
                      : selection.selectedKeys.filter(k => k !== rowKey);
                    selection.onSelectionChange(newKeys);
                  }}
                />
              </td>
            )}
            {columns.map((column) => (
              <td
                key={column.key}
                className={clsx(
                  'px-4 py-3 text-sm text-gray-900 dark:text-gray-100',
                  column.className,
                  compact && 'py-2'
                )}
                style={{ textAlign: column.align }}
              >
                {column.render ? column.render(row, rowIndex) : (row as any)[column.key]}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

function TablePagination({ 
  page, 
  pageSize, 
  total, 
  onPageChange, 
  onPageSizeChange 
}: { 
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {total > 0 ? `${start}~${end} / ${total}개` : '데이터 없음'}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="w-auto px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>{size}개씩</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange?.(1)}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown size={16} className="-rotate-90" />
          </button>
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="w-10 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => onPageChange?.(totalPages)}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown size={16} className="rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  striped = true,
  hoverable = true,
  bordered = false,
  compact = false,
  emptyMessage = '데이터가 없습니다.',
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
  selection,
  className,
  ...props
}: TableProps<T>) {
  return (
    <div className={clsx('w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900', bordered && 'border', className)}>
      <div className="overflow-x-auto">
        <table className="w-full" {...props}>
          <TableHeader columns={columns} sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} selection={selection} />
          <TableBody 
            columns={columns} 
            data={data} 
            keyExtractor={keyExtractor} 
            hoverable={hoverable} 
            striped={striped}
            onRowClick={onRowClick}
            selection={selection}
            compact={compact}
          />
        </table>
      </div>
      {pagination && <TablePagination {...pagination} />}
    </div>
  );
}

export function createColumnHelper<T>() {
  return {
    text: (options: Omit<Column<T>, 'render'> & { render?: (row: T) => string }) => ({
      ...options,
      render: options.render ? (row: T) => React.createElement('span', null, options.render?.(row)) : undefined,
    }),
    number: (options: Omit<Column<T>, 'render' | 'align'> & { render?: (row: T) => number }) => ({
      ...options,
      align: 'right',
      render: options.render ? (row: T) => React.createElement('span', null, new Intl.NumberFormat('ko-KR').format(options.render?.(row) ?? 0)) : undefined,
    }),
    badge: (options: Omit<Column<T>, 'render'> & { 
      variant?: (row: T) => 'default' | 'success' | 'warning' | 'error' | 'info';
      label?: (row: T) => string;
    }) => ({
      ...options,
      render: (row: T) => {
        const variant = options.variant?.(row) || 'default';
        const label = options.label?.(row) || String((row as any)[options.key]);
        const variantStyles = {
          default: 'bg-gray-100 text-gray-700',
          success: 'bg-green-100 text-green-700',
          warning: 'bg-yellow-100 text-yellow-700',
          error: 'bg-red-100 text-red-700',
          info: 'bg-blue-100 text-blue-700',
        };
        return React.createElement('span', {
          className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`
        }, label);
      },
    }),
    actions: (options: { 
      render: (row: T) => React.ReactNode;
      header?: string;
    }) => ({
      key: '__actions__',
      header: options.header || '작업',
      render: options.render,
      sortable: false,
      width: '120px',
      align: 'center' as const,
    }),
  };
}