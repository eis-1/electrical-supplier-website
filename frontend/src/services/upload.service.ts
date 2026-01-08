import apiClient from './api';

export interface UploadResponse {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
}

export const uploadService = {
  /**
   * Upload a single file (image or PDF)
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ success: boolean; data: UploadResponse }>(
      '/upload/single',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(files: File[]): Promise<UploadResponse[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post<{ success: boolean; data: UploadResponse[] }>(
      '/upload/multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  /**
   * Delete a file
   */
  async deleteFile(type: 'images' | 'documents', filename: string): Promise<void> {
    await apiClient.delete(`/upload/${type}/${filename}`);
  },

  /**
   * Get full URL for uploaded file
   */
  getFileUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    // Remove leading slash if present
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${cleanUrl}`;
  },
};
