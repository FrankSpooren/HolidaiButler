import client from './client.js';

const brandProfileService = {
  getProfile: (destId) =>
    client.get('/brand-profile', { params: { destination_id: destId } }).then(r => r.data),

  updateProfile: (destId, data) =>
    client.put('/brand-profile', data, { params: { destination_id: destId } }).then(r => r.data),

  // Personas
  getPersonas: (destId) =>
    client.get('/brand-profile/personas', { params: { destination_id: destId } }).then(r => r.data),

  createPersona: (destId, data) =>
    client.post('/brand-profile/personas', data, { params: { destination_id: destId } }).then(r => r.data),

  updatePersona: (id, data) =>
    client.put(`/brand-profile/personas/${id}`, data).then(r => r.data),

  deletePersona: (id) =>
    client.delete(`/brand-profile/personas/${id}`).then(r => r.data),

  // Knowledge Base
  getKnowledge: (destId) =>
    client.get('/brand-profile/knowledge', { params: { destination_id: destId } }).then(r => r.data),

  addKnowledge: (destId, data) =>
    client.post('/brand-profile/knowledge', data, { params: { destination_id: destId } }).then(r => r.data),

  uploadKnowledgeDoc: (destId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('destination_id', destId);
    return client.post('/brand-profile/knowledge/upload', formData, {
      params: { destination_id: destId },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }).then(r => r.data);
  },

  deleteKnowledge: (id) =>
    client.delete(`/brand-profile/knowledge/${id}`).then(r => r.data),

  // Competitors
  getCompetitors: (destId) =>
    client.get('/brand-profile/competitors', { params: { destination_id: destId } }).then(r => r.data),

  addCompetitor: (destId, data) =>
    client.post('/brand-profile/competitors', data, { params: { destination_id: destId } }).then(r => r.data),

  analyzeCompetitor: (id) =>
    client.post(`/brand-profile/competitors/${id}/analyze`).then(r => r.data),

  deleteCompetitor: (id) =>
    client.delete(`/brand-profile/competitors/${id}`).then(r => r.data),

  // Website analysis
  analyzeWebsite: (destId, url) =>
    client.post('/brand-profile/analyze-website', { url }, { params: { destination_id: destId }, timeout: 30000 }).then(r => r.data),
};

export default brandProfileService;
