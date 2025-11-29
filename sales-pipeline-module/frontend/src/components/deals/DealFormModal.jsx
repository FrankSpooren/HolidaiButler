/**
 * Deal Form Modal - Create/Edit deal form
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Autocomplete,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Close as CloseIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { dealsAPI, accountsAPI, contactsAPI, pipelinesAPI } from '../../services/api';

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'default' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'urgent', label: 'Urgent', color: 'error' }
];

const DealFormModal = ({ open, onClose, deal, initialStageId, pipelineId, onSaved }) => {
  const isEditing = Boolean(deal?.id);

  const [formData, setFormData] = useState({
    title: '',
    value: '',
    probability: 50,
    priority: 'medium',
    expectedCloseDate: null,
    stageId: initialStageId || '',
    pipelineId: pipelineId || '',
    accountId: null,
    contactId: null,
    description: '',
    source: '',
    tags: []
  });

  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      loadInitialData();
      if (deal) {
        setFormData({
          title: deal.title || '',
          value: deal.value || '',
          probability: deal.probability || 50,
          priority: deal.priority || 'medium',
          expectedCloseDate: deal.expectedCloseDate ? dayjs(deal.expectedCloseDate) : null,
          stageId: deal.stageId || initialStageId || '',
          pipelineId: deal.pipelineId || pipelineId || '',
          accountId: deal.accountId || null,
          contactId: deal.contactId || null,
          description: deal.description || '',
          source: deal.source || '',
          tags: deal.tags || []
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          stageId: initialStageId || '',
          pipelineId: pipelineId || ''
        }));
      }
    }
  }, [open, deal, initialStageId, pipelineId]);

  const loadInitialData = async () => {
    try {
      const [accountsRes, pipelinesRes] = await Promise.all([
        accountsAPI.getAll({ limit: 100 }),
        pipelinesAPI.getById(pipelineId)
      ]);

      setAccounts(accountsRes.data.data.accounts || accountsRes.data.data || []);
      setStages(pipelinesRes.data.data.stages || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadContacts = async (accountId) => {
    if (!accountId) {
      setContacts([]);
      return;
    }
    try {
      const { data } = await accountsAPI.getContacts(accountId);
      setContacts(data.data || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target?.value ?? event;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));

    if (field === 'accountId') {
      loadContacts(value);
      setFormData((prev) => ({ ...prev, contactId: null }));
    }
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, expectedCloseDate: date }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.stageId) {
      newErrors.stageId = 'Stage is required';
    }
    if (formData.value && isNaN(Number(formData.value))) {
      newErrors.value = 'Value must be a number';
    }
    if (formData.probability < 0 || formData.probability > 100) {
      newErrors.probability = 'Probability must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        value: formData.value ? Number(formData.value) : 0,
        probability: Number(formData.probability),
        expectedCloseDate: formData.expectedCloseDate?.toISOString()
      };

      if (isEditing) {
        await dealsAPI.update(deal.id, payload);
        toast.success('Deal updated successfully');
      } else {
        await dealsAPI.create(payload);
        toast.success('Deal created successfully');
      }

      onSaved();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save deal';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>
          {isEditing ? 'Edit Deal' : 'Create New Deal'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* Deal Title */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Deal Title"
              value={formData.title}
              onChange={handleChange('title')}
              error={Boolean(errors.title)}
              helperText={errors.title}
              required
              placeholder="e.g., Enterprise License - Q4"
            />
          </Grid>

          {/* Value and Probability */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Deal Value"
              type="number"
              value={formData.value}
              onChange={handleChange('value')}
              error={Boolean(errors.value)}
              helperText={errors.value}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                )
              }}
              placeholder="0"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Probability (%)"
              type="number"
              value={formData.probability}
              onChange={handleChange('probability')}
              error={Boolean(errors.probability)}
              helperText={errors.probability}
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>

          {/* Stage and Priority */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={Boolean(errors.stageId)} required>
              <InputLabel>Pipeline Stage</InputLabel>
              <Select
                value={formData.stageId}
                onChange={handleChange('stageId')}
                label="Pipeline Stage"
              >
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={stage.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: stage.color || '#94a3b8'
                        }}
                      />
                      {stage.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={handleChange('priority')}
                label="Priority"
              >
                {priorityOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Chip
                      size="small"
                      label={option.label}
                      color={option.color}
                      sx={{ mr: 1 }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Expected Close Date */}
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Expected Close Date"
              value={formData.expectedCloseDate}
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  fullWidth: true
                }
              }}
            />
          </Grid>

          {/* Source */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Lead Source</InputLabel>
              <Select
                value={formData.source}
                onChange={handleChange('source')}
                label="Lead Source"
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="website">Website</MenuItem>
                <MenuItem value="referral">Referral</MenuItem>
                <MenuItem value="linkedin">LinkedIn</MenuItem>
                <MenuItem value="cold_call">Cold Call</MenuItem>
                <MenuItem value="trade_show">Trade Show</MenuItem>
                <MenuItem value="partner">Partner</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Account */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={accounts}
              getOptionLabel={(option) => option.name || ''}
              value={accounts.find((a) => a.id === formData.accountId) || null}
              onChange={(_, newValue) => handleChange('accountId')(newValue?.id || null)}
              renderInput={(params) => (
                <TextField {...params} label="Account" placeholder="Select account" />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.industry}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Grid>

          {/* Contact */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={contacts}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}` || ''}
              value={contacts.find((c) => c.id === formData.contactId) || null}
              onChange={(_, newValue) => handleChange('contactId')(newValue?.id || null)}
              disabled={!formData.accountId}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Primary Contact"
                  placeholder={formData.accountId ? 'Select contact' : 'Select account first'}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body2">
                      {option.firstName} {option.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.title} - {option.email}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="Add notes about this deal..."
            />
          </Grid>

          {/* Tags */}
          <Grid item xs={12}>
            <Autocomplete
              multiple
              freeSolo
              options={['Enterprise', 'SMB', 'Renewal', 'Expansion', 'New Business', 'Partner']}
              value={formData.tags}
              onChange={(_, newValue) => setFormData((prev) => ({ ...prev, tags: newValue }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Tags" placeholder="Add tags..." />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Saving...' : isEditing ? 'Update Deal' : 'Create Deal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DealFormModal;
