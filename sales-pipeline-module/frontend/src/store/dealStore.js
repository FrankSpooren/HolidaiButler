/**
 * Deal Store - Deal and Pipeline state management
 */

import { create } from 'zustand';
import { dealsAPI, pipelinesAPI } from '../services/api';
import { toast } from 'react-toastify';

const useDealStore = create((set, get) => ({
  // State
  deals: [],
  deal: null,
  pipelines: [],
  currentPipeline: null,
  kanbanData: {},
  isLoading: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  filters: {
    stageId: null,
    ownerId: null,
    priority: null,
    status: null,
    search: '',
    dateRange: null
  },
  sortBy: 'updatedAt',
  sortOrder: 'desc',

  // Pipeline Actions
  fetchPipelines: async () => {
    try {
      const { data } = await pipelinesAPI.getAll();
      const pipelines = data.data;
      set({ pipelines });

      // Set first pipeline as current if not set
      if (!get().currentPipeline && pipelines.length > 0) {
        set({ currentPipeline: pipelines[0] });
      }

      return pipelines;
    } catch (error) {
      toast.error('Failed to load pipelines');
      return [];
    }
  },

  setCurrentPipeline: (pipeline) => {
    set({ currentPipeline: pipeline });
  },

  createPipeline: async (pipelineData) => {
    try {
      const { data } = await pipelinesAPI.create(pipelineData);
      const pipelines = [...get().pipelines, data.data];
      set({ pipelines });
      toast.success('Pipeline created');
      return data.data;
    } catch (error) {
      toast.error('Failed to create pipeline');
      return null;
    }
  },

  updatePipeline: async (id, pipelineData) => {
    try {
      const { data } = await pipelinesAPI.update(id, pipelineData);
      const pipelines = get().pipelines.map((p) =>
        p.id === id ? data.data : p
      );
      set({ pipelines });

      if (get().currentPipeline?.id === id) {
        set({ currentPipeline: data.data });
      }

      toast.success('Pipeline updated');
      return data.data;
    } catch (error) {
      toast.error('Failed to update pipeline');
      return null;
    }
  },

  deletePipeline: async (id) => {
    try {
      await pipelinesAPI.delete(id);
      const pipelines = get().pipelines.filter((p) => p.id !== id);
      set({ pipelines });

      if (get().currentPipeline?.id === id) {
        set({ currentPipeline: pipelines[0] || null });
      }

      toast.success('Pipeline deleted');
      return true;
    } catch (error) {
      toast.error('Failed to delete pipeline');
      return false;
    }
  },

  // Stage Actions
  addStage: async (pipelineId, stageData) => {
    try {
      const { data } = await pipelinesAPI.addStage(pipelineId, stageData);
      await get().fetchPipelines();
      toast.success('Stage added');
      return data.data;
    } catch (error) {
      toast.error('Failed to add stage');
      return null;
    }
  },

  updateStage: async (pipelineId, stageId, stageData) => {
    try {
      await pipelinesAPI.updateStage(pipelineId, stageId, stageData);
      await get().fetchPipelines();
      toast.success('Stage updated');
      return true;
    } catch (error) {
      toast.error('Failed to update stage');
      return false;
    }
  },

  deleteStage: async (pipelineId, stageId) => {
    try {
      await pipelinesAPI.deleteStage(pipelineId, stageId);
      await get().fetchPipelines();
      toast.success('Stage deleted');
      return true;
    } catch (error) {
      toast.error('Failed to delete stage');
      return false;
    }
  },

  reorderStages: async (pipelineId, stageIds) => {
    try {
      await pipelinesAPI.reorderStages(pipelineId, stageIds);
      await get().fetchPipelines();
      return true;
    } catch (error) {
      toast.error('Failed to reorder stages');
      return false;
    }
  },

  // Deal Actions
  fetchDeals: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { filters, sortBy, sortOrder, pagination } = get();
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        ...filters,
        ...params
      };

      // Remove empty filters
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === null || queryParams[key] === '') {
          delete queryParams[key];
        }
      });

      const { data } = await dealsAPI.getAll(queryParams);

      set({
        deals: data.data.deals || data.data,
        pagination: data.data.pagination || get().pagination,
        isLoading: false
      });

      return data.data;
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to load deals');
      return null;
    }
  },

  fetchKanbanData: async (pipelineId) => {
    set({ isLoading: true });
    try {
      const { data } = await dealsAPI.getKanban(pipelineId || get().currentPipeline?.id);
      set({ kanbanData: data.data, isLoading: false });
      return data.data;
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to load pipeline board');
      return null;
    }
  },

  fetchDeal: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await dealsAPI.getById(id);
      set({ deal: data.data, isLoading: false });
      return data.data;
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to load deal');
      return null;
    }
  },

  createDeal: async (dealData) => {
    set({ isLoading: true });
    try {
      const { data } = await dealsAPI.create(dealData);
      const deals = [data.data, ...get().deals];
      set({ deals, isLoading: false });
      toast.success('Deal created');
      return data.data;
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to create deal');
      return null;
    }
  },

  updateDeal: async (id, dealData) => {
    set({ isLoading: true });
    try {
      const { data } = await dealsAPI.update(id, dealData);
      const deals = get().deals.map((d) => (d.id === id ? data.data : d));
      set({ deals, isLoading: false });

      if (get().deal?.id === id) {
        set({ deal: data.data });
      }

      toast.success('Deal updated');
      return data.data;
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to update deal');
      return null;
    }
  },

  deleteDeal: async (id) => {
    try {
      await dealsAPI.delete(id);
      const deals = get().deals.filter((d) => d.id !== id);
      set({ deals });

      if (get().deal?.id === id) {
        set({ deal: null });
      }

      toast.success('Deal deleted');
      return true;
    } catch (error) {
      toast.error('Failed to delete deal');
      return false;
    }
  },

  updateDealStage: async (dealId, stageId, options = {}) => {
    try {
      const { data } = await dealsAPI.updateStage(dealId, stageId, options);

      // Update deals list
      const deals = get().deals.map((d) =>
        d.id === dealId ? { ...d, stageId, stage: data.data.stage } : d
      );
      set({ deals });

      // Update kanban data optimistically
      const kanbanData = { ...get().kanbanData };
      if (kanbanData.stages) {
        // Move deal between stages in kanban
        Object.keys(kanbanData.stages).forEach((key) => {
          kanbanData.stages[key] = kanbanData.stages[key].filter(
            (d) => d.id !== dealId
          );
        });
        if (kanbanData.stages[stageId]) {
          kanbanData.stages[stageId].push(data.data);
        }
        set({ kanbanData });
      }

      if (get().deal?.id === dealId) {
        set({ deal: data.data });
      }

      return data.data;
    } catch (error) {
      toast.error('Failed to move deal');
      return null;
    }
  },

  bulkUpdateDeals: async (ids, data) => {
    try {
      await dealsAPI.bulkUpdate(ids, data);
      await get().fetchDeals();
      toast.success(`${ids.length} deals updated`);
      return true;
    } catch (error) {
      toast.error('Failed to update deals');
      return false;
    }
  },

  bulkDeleteDeals: async (ids) => {
    try {
      await dealsAPI.bulkDelete(ids);
      const deals = get().deals.filter((d) => !ids.includes(d.id));
      set({ deals });
      toast.success(`${ids.length} deals deleted`);
      return true;
    } catch (error) {
      toast.error('Failed to delete deals');
      return false;
    }
  },

  duplicateDeal: async (id) => {
    try {
      const { data } = await dealsAPI.duplicate(id);
      const deals = [data.data, ...get().deals];
      set({ deals });
      toast.success('Deal duplicated');
      return data.data;
    } catch (error) {
      toast.error('Failed to duplicate deal');
      return null;
    }
  },

  // Activity Actions
  addActivity: async (dealId, activityData) => {
    try {
      const { data } = await dealsAPI.addActivity(dealId, activityData);
      toast.success('Activity logged');
      return data.data;
    } catch (error) {
      toast.error('Failed to log activity');
      return null;
    }
  },

  fetchActivities: async (dealId) => {
    try {
      const { data } = await dealsAPI.getActivities(dealId);
      return data.data;
    } catch (error) {
      toast.error('Failed to load activities');
      return [];
    }
  },

  fetchTimeline: async (dealId) => {
    try {
      const { data } = await dealsAPI.getTimeline(dealId);
      return data.data;
    } catch (error) {
      toast.error('Failed to load timeline');
      return [];
    }
  },

  // Note Actions
  addNote: async (dealId, noteData) => {
    try {
      const { data } = await dealsAPI.addNote(dealId, noteData);
      toast.success('Note added');
      return data.data;
    } catch (error) {
      toast.error('Failed to add note');
      return null;
    }
  },

  // Forecast
  fetchForecast: async (params = {}) => {
    try {
      const { data } = await dealsAPI.getForecast(params);
      return data.data;
    } catch (error) {
      toast.error('Failed to load forecast');
      return null;
    }
  },

  // Filter & Sort Actions
  setFilters: (newFilters) => {
    set({
      filters: { ...get().filters, ...newFilters },
      pagination: { ...get().pagination, page: 1 }
    });
  },

  clearFilters: () => {
    set({
      filters: {
        stageId: null,
        ownerId: null,
        priority: null,
        status: null,
        search: '',
        dateRange: null
      },
      pagination: { ...get().pagination, page: 1 }
    });
  },

  setSort: (sortBy, sortOrder = 'desc') => {
    set({ sortBy, sortOrder });
  },

  setPage: (page) => {
    set({ pagination: { ...get().pagination, page } });
  },

  setPageSize: (limit) => {
    set({ pagination: { ...get().pagination, limit, page: 1 } });
  },

  // Clear state
  clearDeal: () => {
    set({ deal: null });
  },

  clearAll: () => {
    set({
      deals: [],
      deal: null,
      kanbanData: {},
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
  }
}));

export default useDealStore;
