import api from "../api/axios";

export interface StorageUploadPayload {
  original_filename: string;
  mime_type: string;
  file_size: number;
  folder?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface StorageUploadResponse {
  upload_url: string;
  object_key: string;
  file_id: string;
}

export interface StorageDownloadResponse {
  download_url: string;
  object_key: string;
  file_id: string;
}

export const storageService = {
  /**
   * Request a presigned upload URL from the backend storage API.
   */
  requestUploadUrl: async (payload: StorageUploadPayload): Promise<StorageUploadResponse> => {
    const response = await api.post("/storage/upload-url", payload);
    const data = response.data?.data || response.data;
    return data as StorageUploadResponse;
  },

  /**
   * Confirm that a file has been uploaded to storage.
   */
  confirmUpload: async (fileId: string): Promise<unknown> => {
    const response = await api.put(`/storage/${fileId}/confirm`);
    return response.data;
  },

  /**
   * Retrieve a presigned download URL for a stored file.
   */
  getDownloadUrl: async (fileId: string): Promise<StorageDownloadResponse> => {
    const response = await api.get(`/storage/${fileId}/download-url`);
    const data = response.data?.data || response.data;
    return data as StorageDownloadResponse;
  },

  /**
   * Complete end-to-end file upload workflow:
   * 1. Get presigned upload URL from backend
   * 2. PUT binary file directly to presigned S3/Supabase URL
   * 3. Confirm upload with backend
   * 4. Retrieve persistent download URL
   */
  uploadFile: async (
    file: File,
    options: {
      folder?: string;
      entity_type?: string;
      entity_id?: string;
    } = {}
  ): Promise<string> => {
    const folder = options.folder || "dogs";
    const entityType = options.entity_type || "dog_profile";

    // 1. Request presigned upload URL
    const uploadRes = await storageService.requestUploadUrl({
      original_filename: file.name,
      mime_type: file.type || "image/jpeg",
      file_size: file.size,
      folder,
      entity_type: entityType,
      entity_id: options.entity_id,
    });

    const { upload_url, file_id } = uploadRes;
    if (!upload_url || !file_id) {
      throw new Error("Failed to generate storage upload URL.");
    }

    // 2. Upload file binary directly to presigned S3 / Supabase URL via PUT
    const s3Response = await fetch(upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "image/jpeg",
      },
      body: file,
    });

    if (!s3Response.ok) {
      throw new Error(`Storage upload failed with HTTP status ${s3Response.status}`);
    }

    // 3. Confirm upload with backend
    await storageService.confirmUpload(file_id);

    // 4. Retrieve presigned download URL (or fallback to base upload URL)
    let persistentUrl = "";
    try {
      const downloadRes = await storageService.getDownloadUrl(file_id);
      persistentUrl = downloadRes.download_url || "";
    } catch {
      /* ignore download_url fetch error and use upload_url fallback */
    }

    if (!persistentUrl && upload_url) {
      persistentUrl = upload_url;
    }

    return persistentUrl;
  },
};

export default storageService;
