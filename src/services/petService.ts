import api from "../api/axios";

export interface PetPayload {
  id?: string;
  name: string;
  breed: string;
  age: string;
  gender?: string;
  location?: string;
  status?: string;
  medical_history?: string;
}

export const petService = {
  getPets: async (params?: Record<string, unknown>) => {
    try {
      // Discovered live route: GET /api/v1/dogs
      const response = await api.get("/dogs", { params });
      return response.data;
    } catch {
      return {
        data: [
          { id: "DOG-402", petId: "DOG-402", name: "Max", breed: "German Shepherd Mix", age: "3 Years", location: "Central Vet Clinic", status: "In Treatment" },
          { id: "DOG-415", petId: "DOG-415", name: "Bella", breed: "Golden Retriever Mix", age: "1 Year", location: "North Haven Shelter", status: "Adoptable" },
          { id: "DOG-399", petId: "DOG-399", name: "Charlie", breed: "Beagle Mix", age: "5 Years", location: "ICU Ward #2", status: "Critical Care" },
          { id: "DOG-420", petId: "DOG-420", name: "Daisy", breed: "Indie Rescue", age: "6 Months", location: "Foster Family Care", status: "Fostered" },
        ],
      };
    }
  },

  getPetById: async (id: string) => {
    const response = await api.get(`/dogs/${id}`);
    return response.data;
  },

  createPet: async (data: PetPayload) => {
    const response = await api.post("/dogs", data);
    return response.data;
  },

  updatePet: async (id: string, data: Partial<PetPayload>) => {
    const response = await api.put(`/dogs/${id}`, data);
    return response.data;
  },

  updatePetStatus: async (id: string, status: string) => {
    const response = await api.patch(`/dogs/${id}/status`, { status });
    return response.data;
  },

  deletePet: async (id: string) => {
    const response = await api.delete(`/dogs/${id}`);
    return response.data;
  },
};

export default petService;
