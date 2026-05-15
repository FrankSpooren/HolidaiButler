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

  // Knowledge Base preview + download (Blok 1)
  // Backend routes: /brand-sources/:id/(preview|download)
  // - preview: editor role (view in dialog), returns PDF blob OR JSON excerpt
  // - download: destination_admin role (forced download)
  previewKnowledge: async (id) => {
    const res = await client.get(`/brand-sources/${id}/preview`, { responseType: 'blob' });
    const contentType = res.headers['content-type'] || '';
    if (contentType.startsWith('application/pdf')) {
      // Inline PDF — return blob URL for iframe rendering
      // Caller MUST URL.revokeObjectURL() when dialog closes (memory leak prevention)
      return { type: 'pdf', blobUrl: URL.createObjectURL(res.data) };
    }
    // JSON response — content_excerpt + metadata for <pre> rendering
    const text = await res.data.text();
    const json = JSON.parse(text);
    return { type: 'json', ...(json.data || {}) };
  },

  downloadKnowledge: async (id) => {
    const res = await client.get(`/brand-sources/${id}/download`, { responseType: 'blob' });
    const match = (res.headers['content-disposition'] || '').match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `knowledge-${id}`;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { filename, size: res.data.size };
  },
};

export default brandProfileService;
