import api from "../api/axios";

export interface VehiclePayload {
  id?: string;
  vehicle_number: string;
  model?: string;
  type?: string;
  assigned_driver?: string;
  status?: string;
  fuel_level?: string;
  last_service_date?: string;
  [key: string]: unknown;
}

export const vehicleService = {
  // GET /fleet/vehicles (Exact OpenAPI endpoint)
  getVehicles: async (params?: Record<string, unknown>) => {
    const response = await api.get("/fleet/vehicles", { params });
    return response.data;
  },

  createVehicle: async (data: VehiclePayload) => {
    const response = await api.post("/fleet/vehicles", data);
    return response.data;
  },

  updateVehicle: async (id: string, data: Partial<VehiclePayload>) => {
    const response = await api.put(`/fleet/vehicles/${id}`, data);
    return response.data;
  },

  deleteVehicle: async (id: string) => {
    const response = await api.delete(`/fleet/vehicles/${id}`);
    return response.data;
  },
};

export default vehicleService;
