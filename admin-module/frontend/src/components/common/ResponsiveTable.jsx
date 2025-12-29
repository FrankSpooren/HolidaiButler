import { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
  Stack,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

/**
 * ResponsiveTable - A mobile-first table component
 *
 * Features:
 * - Card-based view on mobile (xs, sm)
 * - Traditional table on desktop (md+)
 * - Sortable columns
 * - Expandable rows on mobile
 * - Pagination
 *
 * Props:
 * - columns: Array of column definitions { id, label, minWidth, align, sortable, render, mobileHidden, mobilePriority }
 * - rows: Array of data rows
 * - loading: Boolean for loading state
 * - emptyMessage: String to show when no data
 * - emptyIcon: React node for empty state icon
 * - page: Current page (0-indexed)
 * - rowsPerPage: Rows per page
 * - totalCount: Total number of rows
 * - onPageChange: Function(event, newPage)
 * - onRowsPerPageChange: Function(event)
 * - onSort: Function(columnId, direction) - optional
 * - sortBy: Current sort column
 * - sortDirection: 'asc' | 'desc'
 * - onRowClick: Function(row) - optional
 * - rowKey: Function(row) => unique key
 * - actions: Function(row) => React node for action buttons
 */
export default function ResponsiveTable({
  columns = [],
  rows = [],
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon = null,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  sortBy = '',
  sortDirection = 'asc',
  onRowClick,
  rowKey = (row) => row.id || row._id,
  actions,
  rowsPerPageOptions = [5, 10, 25, 50]
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleSort = (columnId) => {
    if (onSort) {
      const newDirection = sortBy === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(columnId, newDirection);
    }
  };

  const toggleRowExpand = (rowId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Get primary columns for mobile card header (mobilePriority: 1)
  const primaryColumns = columns.filter(col => col.mobilePriority === 1);
  // Get secondary columns for mobile card body
  const secondaryColumns = columns.filter(col => !col.mobileHidden && col.mobilePriority !== 1);

  // Mobile Card View
  const MobileCardView = () => (
    <Stack spacing={2}>
      {loading ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">Loading...</Typography>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            {emptyIcon && <Box sx={{ mb: 1 }}>{emptyIcon}</Box>}
            <Typography color="text.secondary">{emptyMessage}</Typography>
          </CardContent>
        </Card>
      ) : (
        rows.map((row) => {
          const key = rowKey(row);
          const isExpanded = expandedRows.has(key);

          return (
            <Card
              key={key}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': onRowClick ? { bgcolor: 'action.hover' } : {}
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                {/* Header row with primary info and expand button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => onRowClick?.(row)}>
                    {primaryColumns.map((col) => (
                      <Box key={col.id}>
                        {col.render ? col.render(row[col.id], row) : (
                          <Typography variant="subtitle1" fontWeight="medium" noWrap>
                            {row[col.id]}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {actions && actions(row)}
                    <IconButton
                      size="small"
                      onClick={() => toggleRowExpand(key)}
                      sx={{ ml: 0.5 }}
                    >
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                </Box>

                {/* Collapsed content - show key info */}
                {!isExpanded && secondaryColumns.slice(0, 2).map((col) => (
                  <Box key={col.id} sx={{ mt: 0.5 }}>
                    {col.render ? col.render(row[col.id], row) : (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {col.label}: {row[col.id]}
                      </Typography>
                    )}
                  </Box>
                ))}

                {/* Expanded content */}
                <Collapse in={isExpanded}>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1}>
                    {secondaryColumns.map((col) => (
                      <Box key={col.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                          {col.label}:
                        </Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          {col.render ? col.render(row[col.id], row) : (
                            <Typography variant="body2">{row[col.id] ?? '-'}</Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Mobile Pagination */}
      {totalCount > 0 && (
        <Paper sx={{ mt: 2 }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={rowsPerPageOptions}
            labelRowsPerPage="Per page:"
            sx={{
              '& .MuiTablePagination-toolbar': {
                flexWrap: 'wrap',
                justifyContent: 'center'
              },
              '& .MuiTablePagination-selectLabel': {
                display: { xs: 'none', sm: 'block' }
              }
            }}
          />
        </Paper>
      )}
    </Stack>
  );

  // Desktop Table View
  const DesktopTableView = () => (
    <Paper>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{
                    minWidth: column.minWidth,
                    fontWeight: 'bold',
                    bgcolor: 'background.paper'
                  }}
                >
                  {column.sortable && onSort ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {actions && (
                <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} align="center" sx={{ py: 8 }}>
                  {emptyIcon && <Box sx={{ mb: 1 }}>{emptyIcon}</Box>}
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  hover
                  onClick={() => onRowClick?.(row)}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((column) => (
                    <TableCell key={column.id} align={column.align || 'left'}>
                      {column.render ? column.render(row[column.id], row) : row[column.id]}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={rowsPerPageOptions}
      />
    </Paper>
  );

  return isMobile ? <MobileCardView /> : <DesktopTableView />;
}
