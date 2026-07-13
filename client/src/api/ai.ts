import apiClient from './client';

export interface GenerateImageResponse {
  imageUrl: string;
}

export interface GenerateCaptionResponse {
  caption: string;
}

export interface UploadResponse {
  url: string;
  publicId: string;
}

export const aiApi = {
  generateImage: (prompt: string) =>
    apiClient.post<GenerateImageResponse>('/ai/generate-image', { prompt }),

  generateCaption: (topic: string, tone?: string, platform?: string) =>
    apiClient.post<GenerateCaptionResponse>('/ai/generate-caption', {
      topic,
      tone,
      platform,
    }),
};

export const mediaApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post<UploadResponse>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  remove: (publicId: string) =>
    apiClient.delete('/media/remove', { data: { publicId } }),
};