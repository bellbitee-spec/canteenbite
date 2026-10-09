import api from "./api";

/**
 * Admin Combo Service
 * Communicates with existing backend /api/combos endpoints
 */
const comboService = {
  /**
   * Fetch combos with query parameters
   * Endpoint: GET /api/combos
   * Always includes includeUnavailable=true for admin view
   */
  getCombos: async (params = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.set("includeUnavailable", "true");

    if (params.includeUnavailable !== undefined) {
      searchParams.set("includeUnavailable", String(params.includeUnavailable));
    }

    const query = searchParams.toString();
    const endpoint = `/combos${query ? `?${query}` : ""}`;
    const response = await api.get(endpoint);
    return (response && response.data && response.data.combos) || [];
  },

  /**
   * Fetch single combo by ID
   * Endpoint: GET /api/combos/:id
   */
  getComboById: async (id) => {
    const response = await api.get(`/combos/${id}`);
    return (response && response.data && response.data.combo) || null;
  },

  /**
   * Create a new combo
   * Endpoint: POST /api/combos
   */
  createCombo: async (comboData) => {
    const response = await api.post("/combos", comboData);
    return response && response.data ? response.data.combo : response;
  },

  /**
   * Update an existing combo
   * Endpoint: PATCH /api/combos/:id
   */
  updateCombo: async (id, comboData) => {
    const response = await api.patch(`/combos/${id}`, comboData);
    return response && response.data ? response.data.combo : response;
  },

  /**
   * Soft-delete / disable a combo
   * Endpoint: DELETE /api/combos/:id
   */
  deleteCombo: async (id) => {
    return await api.delete(`/combos/${id}`);
  },
};

export default comboService;
