/**
 * Pipeline Page - Kanban board for deal management
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  LinearProgress,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Select,
  FormControl,
  InputLabel,
  AvatarGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import useDealStore from '../../store/dealStore';
import useUIStore from '../../store/uiStore';
import DealFormModal from '../../components/deals/DealFormModal';

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Deal Card Component
const DealCard = ({ deal, onEdit, onDelete, onDuplicate, onView }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const priorityColors = {
    low: 'default',
    medium: 'warning',
    high: 'error',
    urgent: 'error'
  };

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleMenuClose();
    switch (action) {
      case 'view':
        navigate(`/deals/${deal.id}`);
        break;
      case 'edit':
        onEdit(deal);
        break;
      case 'duplicate':
        onDuplicate(deal.id);
        break;
      case 'delete':
        onDelete(deal.id);
        break;
    }
  };

  return (
    <Card
      className="kanban-card"
      sx={{
        mb: 1.5,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' }
      }}
      onClick={() => navigate(`/deals/${deal.id}`)}
    >
      <CardContent sx={{ p: '12px !important' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>
            {deal.title}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ mt: -0.5, mr: -0.5 }}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Company */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <BusinessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {deal.account?.name || deal.company || 'No company'}
          </Typography>
        </Box>

        {/* Value */}
        <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ mb: 1.5 }}>
          {formatCurrency(deal.value || 0)}
        </Typography>

        {/* Probability */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Probability
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {deal.probability || 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={deal.probability || 0}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                bgcolor: deal.probability >= 70 ? 'success.main' : deal.probability >= 40 ? 'warning.main' : 'info.main'
              }
            }}
          />
        </Box>

        {/* Meta Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {deal.priority && (
              <Chip
                size="small"
                label={deal.priority}
                color={priorityColors[deal.priority]}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
            {deal.expectedCloseDate && (
              <Tooltip title={`Expected close: ${new Date(deal.expectedCloseDate).toLocaleDateString()}`}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <ScheduleIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(deal.expectedCloseDate), { addSuffix: true })}
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Box>
          {deal.owner && (
            <Tooltip title={`${deal.owner.firstName} ${deal.owner.lastName}`}>
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: '0.7rem',
                  bgcolor: 'primary.main'
                }}
              >
                {deal.owner.firstName?.[0]}
                {deal.owner.lastName?.[0]}
              </Avatar>
            </Tooltip>
          )}
        </Box>

        {/* Quick Actions */}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          <Tooltip title="Call">
            <IconButton size="small" onClick={(e) => e.stopPropagation()}>
              <PhoneIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Email">
            <IconButton size="small" onClick={(e) => e.stopPropagation()}>
              <EmailIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Schedule Meeting">
            <IconButton size="small" onClick={(e) => e.stopPropagation()}>
              <EventIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => handleAction('view')}>
          <ViewIcon sx={{ mr: 1, fontSize: 18 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => handleAction('edit')}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => handleAction('duplicate')}>
          <CopyIcon sx={{ mr: 1, fontSize: 18 }} /> Duplicate
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

// Draggable Deal Card
const DraggableDealCard = ({ deal, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} {...props} />
    </div>
  );
};

// Pipeline Column Component
const PipelineColumn = ({ stage, deals, onAddDeal, onEditDeal, onDeleteDeal, onDuplicateDeal }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id
  });

  const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const weightedValue = deals.reduce((sum, deal) => sum + (deal.value || 0) * (deal.probability || 0) / 100, 0);

  return (
    <Box
      ref={setNodeRef}
      sx={{
        width: 300,
        minWidth: 300,
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Column Header */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: '8px 8px 0 0',
          bgcolor: stage.color || '#94a3b8',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {stage.name}
          </Typography>
          <Chip
            size="small"
            label={deals.length}
            sx={{
              height: 20,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Total: {formatCurrency(totalValue)}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Weighted: {formatCurrency(weightedValue)}
          </Typography>
        </Box>
      </Box>

      {/* Column Body */}
      <Box
        className="kanban-column"
        sx={{
          flex: 1,
          borderRadius: '0 0 8px 8px',
          p: 1.5,
          bgcolor: isOver ? 'action.hover' : '#f1f5f9',
          transition: 'background-color 0.2s',
          overflowY: 'auto'
        }}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              onEdit={onEditDeal}
              onDelete={onDeleteDeal}
              onDuplicate={onDuplicateDeal}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <Box
            sx={{
              p: 3,
              textAlign: 'center',
              color: 'text.secondary',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2
            }}
          >
            <Typography variant="body2">Drop deals here</Typography>
          </Box>
        )}

        {/* Add Deal Button */}
        <Button
          fullWidth
          variant="text"
          startIcon={<AddIcon />}
          onClick={() => onAddDeal(stage.id)}
          sx={{ mt: 1, color: 'text.secondary' }}
        >
          Add Deal
        </Button>
      </Box>
    </Box>
  );
};

const Pipeline = () => {
  const navigate = useNavigate();
  const { pipelineId } = useParams();

  const {
    pipelines,
    currentPipeline,
    kanbanData,
    isLoading,
    fetchPipelines,
    setCurrentPipeline,
    fetchKanbanData,
    updateDealStage,
    deleteDeal,
    duplicateDeal
  } = useDealStore();

  const { openModal } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [pipelineAnchor, setPipelineAnchor] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [initialStageId, setInitialStageId] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (pipelineId && pipelines.length > 0) {
      const pipeline = pipelines.find((p) => p.id === pipelineId);
      if (pipeline) {
        setCurrentPipeline(pipeline);
      }
    }
  }, [pipelineId, pipelines]);

  useEffect(() => {
    if (currentPipeline) {
      fetchKanbanData(currentPipeline.id);
    }
  }, [currentPipeline]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const dealId = active.id;
    const newStageId = over.id;

    // Find current stage
    const stages = currentPipeline?.stages || [];
    let currentStageId = null;

    for (const stage of stages) {
      const deals = kanbanData[stage.id] || [];
      if (deals.some((d) => d.id === dealId)) {
        currentStageId = stage.id;
        break;
      }
    }

    if (currentStageId !== newStageId) {
      await updateDealStage(dealId, newStageId);
      fetchKanbanData(currentPipeline.id);
    }
  };

  const handleAddDeal = (stageId) => {
    setSelectedDeal(null);
    setInitialStageId(stageId);
    setShowDealModal(true);
  };

  const handleEditDeal = (deal) => {
    setSelectedDeal(deal);
    setInitialStageId(null);
    setShowDealModal(true);
  };

  const handleDeleteDeal = async (dealId) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      await deleteDeal(dealId);
      fetchKanbanData(currentPipeline.id);
    }
  };

  const handleDuplicateDeal = async (dealId) => {
    await duplicateDeal(dealId);
    fetchKanbanData(currentPipeline.id);
  };

  const handleDealSaved = () => {
    setShowDealModal(false);
    setSelectedDeal(null);
    setInitialStageId(null);
    fetchKanbanData(currentPipeline.id);
  };

  const stages = currentPipeline?.stages || [];

  // Calculate pipeline summary
  const pipelineSummary = stages.reduce(
    (acc, stage) => {
      const deals = kanbanData[stage.id] || [];
      acc.totalDeals += deals.length;
      acc.totalValue += deals.reduce((sum, d) => sum + (d.value || 0), 0);
      acc.weightedValue += deals.reduce((sum, d) => sum + (d.value || 0) * (d.probability || 0) / 100, 0);
      return acc;
    },
    { totalDeals: 0, totalValue: 0, weightedValue: 0 }
  );

  if (isLoading && !kanbanData) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rectangular" width={300} height={500} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h4" fontWeight={700}>
              Sales Pipeline
            </Typography>
            <Button
              size="small"
              onClick={(e) => setPipelineAnchor(e.currentTarget)}
              endIcon={<MoreIcon />}
            >
              {currentPipeline?.name || 'Select Pipeline'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {pipelineSummary.totalDeals} deals &bull; {formatCurrency(pipelineSummary.totalValue)} total value &bull; {formatCurrency(pipelineSummary.weightedValue)} weighted
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              )
            }}
            sx={{ width: 250 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
          >
            Filter
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => navigate('/settings/pipelines')}
          >
            Configure
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleAddDeal(stages[0]?.id)}
          >
            New Deal
          </Button>
        </Box>
      </Box>

      {/* Pipeline Selector Menu */}
      <Menu
        anchorEl={pipelineAnchor}
        open={Boolean(pipelineAnchor)}
        onClose={() => setPipelineAnchor(null)}
      >
        {pipelines.map((pipeline) => (
          <MenuItem
            key={pipeline.id}
            selected={pipeline.id === currentPipeline?.id}
            onClick={() => {
              setCurrentPipeline(pipeline);
              setPipelineAnchor(null);
              navigate(`/pipeline/${pipeline.id}`);
            }}
          >
            {pipeline.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
      >
        <MenuItem>All Deals</MenuItem>
        <MenuItem>My Deals</MenuItem>
        <MenuItem>High Priority</MenuItem>
        <MenuItem>Closing This Month</MenuItem>
        <MenuItem>At Risk</MenuItem>
      </Menu>

      {/* Kanban Board */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          gap: 2,
          pb: 2
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              deals={(kanbanData[stage.id] || []).filter(
                (deal) =>
                  !searchQuery ||
                  deal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  deal.account?.name?.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              onAddDeal={handleAddDeal}
              onEditDeal={handleEditDeal}
              onDeleteDeal={handleDeleteDeal}
              onDuplicateDeal={handleDuplicateDeal}
            />
          ))}
        </DndContext>

        {stages.length === 0 && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary'
            }}
          >
            <Typography variant="h6" gutterBottom>
              No pipeline stages configured
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/settings/pipelines')}
            >
              Configure Pipeline
            </Button>
          </Box>
        )}
      </Box>

      {/* Deal Form Modal */}
      {showDealModal && (
        <DealFormModal
          open={showDealModal}
          onClose={() => setShowDealModal(false)}
          deal={selectedDeal}
          initialStageId={initialStageId}
          pipelineId={currentPipeline?.id}
          onSaved={handleDealSaved}
        />
      )}
    </Box>
  );
};

export default Pipeline;
