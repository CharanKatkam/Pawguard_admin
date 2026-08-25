import api from "../api/axios";

export interface VehiclePayload {
  id?: string;
  make_model?: string;
  license_plate?: string;
  vehicle_number: string;
  registration_number?: string;
  plate?: string;
  model?: string;
  type?: string;
  vehicle_type?: string;
  vehicle_class?: string;
  manufacturing_year?: string | number;
  assigned_driver?: string;
  assigned_agent_id?: string;
  primary_driver_id?: string | null;
  mileage?: number;
  location?: string;
  base_location?: string;
  capacity?: number;
  fuel_level?: string;
  status?: string;
  last_service_date?: string;
  next_service_date?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
  fitness_expiry?: string;
  pollution_expiry?: string;
  equipment?: Record<string, boolean>;
  [key: string]: unknown;
}

// Helpers to format payload according to backend OpenAPI specs for VehicleCreate / VehicleUpdate
const isValidUuid = (val: unknown): boolean => {
  if (typeof val !== "string") return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim());
};

const mapToBackendType = (typeStr?: string): string => {
  if (!typeStr) return "rescue_van";
  const lower = typeStr.toLowerCase().trim();
  if (lower.includes("ambulance")) return "ambulance";
  if (lower.includes("van") || lower.includes("rescue")) return "rescue_van";
  if (lower.includes("vet") || lower.includes("mobile")) return "mobile_vet_unit";
  if (lower.includes("utility") || lower.includes("truck") || lower.includes("transport")) return "utility";
  return "other";
};

const mapToBackendStatus = (statusStr?: string): string => {
  if (!statusStr) return "active";
  const lower = statusStr.toLowerCase().trim();
  if (lower.includes("maintenance") || lower.includes("repair")) return "in_maintenance";
  if (lower.includes("out") || lower.includes("service") || lower.includes("offline")) return "out_of_service";
  return "active";
};

export const vehicleService = {
  // GET /fleet/vehicles (Exact OpenAPI endpoint)
  getVehicles: async (params?: Record<string, unknown>) => {
    const response = await api.get("/fleet/vehicles", { params });
    return response.data;
  },

  createVehicle: async (data: VehiclePayload) => {
    const driverUuid = isValidUuid(data.primary_driver_id)
      ? String(data.primary_driver_id).trim()
      : isValidUuid(data.assigned_agent_id)
      ? String(data.assigned_agent_id).trim()
      : isValidUuid(data.assigned_driver)
      ? String(data.assigned_driver).trim()
      : null;

    const payload: Record<string, unknown> = {
      make_model: data.make_model || data.model || data.vehicle_number || "Vehicle Unit",
      license_plate: data.license_plate || data.registration_number || data.vehicle_number,
      vehicle_type: mapToBackendType(data.vehicle_type || data.type),
      status: mapToBackendStatus(data.status),
      mileage: typeof data.mileage === "number" ? data.mileage : 0,
      primary_driver_id: driverUuid,

      // Scope
      rescue_centre_id: data.rescue_centre_id || data.rescue_center_id,

      // Retain frontend fields for compatibility and client-side UI rendering
      vehicle_number: data.vehicle_number,
      registration_number: data.registration_number || data.license_plate || data.vehicle_number,
      model: data.model || data.make_model,
      type: data.type || data.vehicle_type,
      assigned_driver: data.assigned_driver || "Unassigned",
      location: data.location,
      base_location: data.base_location,
      capacity: data.capacity,
      fuel_level: data.fuel_level,
      equipment: data.equipment,
    };

    const response = await api.post("/fleet/vehicles", payload);
    return response.data;
  },

  updateVehicle: async (id: string, data: Partial<VehiclePayload>) => {
    const driverUuid = isValidUuid(data.primary_driver_id)
      ? String(data.primary_driver_id).trim()
      : isValidUuid(data.assigned_agent_id)
      ? String(data.assigned_agent_id).trim()
      : isValidUuid(data.assigned_driver)
      ? String(data.assigned_driver).trim()
      : null;

    const payload: Record<string, unknown> = {};

    const makeModel = data.make_model || data.model || data.vehicle_number;
    if (makeModel) payload.make_model = makeModel;

    const licensePlate = data.license_plate || data.registration_number || data.vehicle_number;
    if (licensePlate) payload.license_plate = licensePlate;

    if (data.vehicle_type || data.type) {
      payload.vehicle_type = mapToBackendType(data.vehicle_type || data.type);
    }
    if (data.status) {
      payload.status = mapToBackendStatus(data.status);
    }
    if (typeof data.mileage === "number") {
      payload.mileage = data.mileage;
    }
    payload.primary_driver_id = driverUuid;

    // Frontend legacy fields
    if (data.vehicle_number) payload.vehicle_number = data.vehicle_number;
    if (data.registration_number) payload.registration_number = data.registration_number;
    if (data.model) payload.model = data.model;
    if (data.type) payload.type = data.type;
    if (data.assigned_driver) payload.assigned_driver = data.assigned_driver;
    if (data.location) payload.location = data.location;
    if (data.base_location) payload.base_location = data.base_location;
    if (data.capacity) payload.capacity = data.capacity;
    if (data.fuel_level) payload.fuel_level = data.fuel_level;
    if (data.equipment) payload.equipment = data.equipment;

    const response = await api.put(`/fleet/vehicles/${id}`, payload);
    return response.data;
  },

  deleteVehicle: async (id: string) => {
    const response = await api.delete(`/fleet/vehicles/${id}`);
    return response.data;
  },
};

export default vehicleService;
