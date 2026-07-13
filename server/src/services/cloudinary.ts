import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<UploadResult> {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    throw new AppError('Cloudinary is not configured', 500);
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new AppError(
      `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      400
    );
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new AppError('File size exceeds the 10MB limit', 400);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        public_id: `flowpost/${Date.now()}_${fileName.replace(/\.[^/.]+$/, '')}`,
        format: mimeType.split('/')[1],
        folder: 'flowpost',
      },
      (error, result) => {
        if (error) {
          reject(new AppError('Failed to upload image to Cloudinary', 502));
          return;
        }
        if (!result) {
          reject(new AppError('Upload returned no result', 502));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    throw new AppError('Failed to delete image from Cloudinary', 502);
  }
}
