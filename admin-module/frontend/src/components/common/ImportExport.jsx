import { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

export default function ImportExport({
  title = 'Import / Export',
  moduleType,
  onImport,
  onExport,
  importTemplate,
  exportFormats = ['csv', 'excel', 'json']
}) {
  const fileInputRef = useRef(null);

  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [exportDialog, setExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportDateRange, setExportDateRange] = useState('all');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        setImporting(true);
        setError(null);
        setImportResults(null);

        const content = e.target.result;
        const results = await onImport(file, content);

        setImportResults(results);
        if (results.errors?.length === 0) {
          setSuccess(`Successfully imported ${results.successful} ${moduleType}(s)`);
        }
      } catch (err) {
        console.error('Import error:', err);
        setError(err.message || 'Failed to import file');
      } finally {
        setImporting(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
      setImporting(false);
    };

    reader.readAsText(file);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      const result = await onExport({
        format: exportFormat,
        dateRange: exportDateRange
      });

      // Create download link
      const blob = new Blob([result.data], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`Successfully exported ${moduleType} data`);
      setExportDialog(false);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!importTemplate) return;

    const blob = new Blob([importTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${moduleType}_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {title}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Import Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <UploadIcon color="primary" />
              <Typography variant="h6">
                Import {moduleType}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              Upload a CSV file to bulk import {moduleType.toLowerCase()} data. Make sure your file follows the correct format.
            </Typography>

            <Stack spacing={2}>
              {importTemplate && (
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                  fullWidth
                >
                  Download Template
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />

              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                fullWidth
              >
                {importing ? 'Importing...' : 'Select File to Import'}
              </Button>

              {importing && <LinearProgress />}
            </Stack>

            {/* Import Results */}
            {importResults && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Import Results
                </Typography>

                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Total Rows:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {importResults.total}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="success.main">
                      Successful:
                    </Typography>
                    <Chip
                      label={importResults.successful}
                      size="small"
                      color="success"
                      icon={<SuccessIcon />}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="error.main">
                      Failed:
                    </Typography>
                    <Chip
                      label={importResults.failed}
                      size="small"
                      color="error"
                      icon={<ErrorIcon />}
                    />
                  </Box>
                </Stack>

                {importResults.errors && importResults.errors.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Errors:
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {importResults.errors.slice(0, 10).map((err, index) => (
                        <Alert key={index} severity="error" sx={{ mb: 1 }}>
                          <Typography variant="caption">
                            Row {err.row}: {err.message}
                          </Typography>
                        </Alert>
                      ))}
                      {importResults.errors.length > 10 && (
                        <Typography variant="caption" color="text.secondary">
                          ... and {importResults.errors.length - 10} more errors
                        </Typography>
                      )}
                    </Box>
                  </>
                )}

                {importResults.warnings && importResults.warnings.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom sx={{ mt: 2 }}>
                      Warnings:
                    </Typography>
                    <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                      {importResults.warnings.slice(0, 5).map((warning, index) => (
                        <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                          <Typography variant="caption">
                            Row {warning.row}: {warning.message}
                          </Typography>
                        </Alert>
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Export Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DownloadIcon color="primary" />
              <Typography variant="h6">
                Export {moduleType}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              Export your {moduleType.toLowerCase()} data in various formats for backup, analysis, or migration purposes.
            </Typography>

            <Stack spacing={2}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialog(true)}
                disabled={exporting}
                fullWidth
              >
                {exporting ? 'Exporting...' : 'Export Data'}
              </Button>

              {exporting && <LinearProgress />}
            </Stack>

            {/* Export Info */}
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Available Formats
              </Typography>
              <Stack spacing={1}>
                {exportFormats.includes('csv') && (
                  <Chip label="CSV - Spreadsheet" size="small" variant="outlined" />
                )}
                {exportFormats.includes('excel') && (
                  <Chip label="Excel - XLSX" size="small" variant="outlined" />
                )}
                {exportFormats.includes('json') && (
                  <Chip label="JSON - Data" size="small" variant="outlined" />
                )}
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export {moduleType}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                label="Export Format"
              >
                {exportFormats.includes('csv') && (
                  <MenuItem value="csv">CSV (Comma Separated Values)</MenuItem>
                )}
                {exportFormats.includes('excel') && (
                  <MenuItem value="excel">Excel (XLSX)</MenuItem>
                )}
                {exportFormats.includes('json') && (
                  <MenuItem value="json">JSON (JavaScript Object Notation)</MenuItem>
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={exportDateRange}
                onChange={(e) => setExportDateRange(e.target.value)}
                label="Date Range"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
                <MenuItem value="quarter">Last 90 Days</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info">
              <Typography variant="body2">
                This will export all {moduleType.toLowerCase()} data matching the selected criteria.
                Large exports may take a few moments to prepare.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} variant="contained" disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
