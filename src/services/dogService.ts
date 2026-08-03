import api from "../api/axios";

export interface DogPayload {
  id?: string;
  name: string;
  breed?: string;
  age?: number;
  gender?: string;
  status?: string;
  description?: string;
  is_adoptable?: boolean;
  registration_number?: string;
  [key: string]: unknown;
}

export const dogService = {
  // GET /dogs
  getDogs: async (params?: Record<string, unknown>) => {
    const response = await api.get("/dogs", { params });
    return response.data;
  },

  // POST /dogs
  createDog: async (data: DogPayload) => {
    const response = await api.post("/dogs", data);
    return response.data;
  },

  // GET /dogs/{dog_id}
  getDogById: async (dogId: string) => {
    const response = await api.get(`/dogs/${dogId}`);
    return response.data;
  },

  // PUT /dogs/{dog_id}
  updateDog: async (dogId: string, data: Partial<DogPayload>) => {
    const response = await api.put(`/dogs/${dogId}`, data);
    return response.data;
  },

  // DELETE /dogs/{dog_id}
  deleteDog: async (dogId: string) => {
    const response = await api.delete(`/dogs/${dogId}`);
    return response.data;
  },
};

export default dogService;