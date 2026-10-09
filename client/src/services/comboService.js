import api from "./api";

export const getCombos = async () => {
  const response = await api.get("combos");
  return response.data?.combos || [];
};

export const getComboById = async (id) => {
  const response = await api.get(`combos/${id}`);
  return response.data?.combo || null;
};

const comboService = {
  getCombos,
  getComboById,
};

export default comboService;
