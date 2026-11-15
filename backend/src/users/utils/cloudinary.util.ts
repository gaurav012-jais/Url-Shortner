import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

/**
 * Configures Cloudinary from environment variables or CLOUDINARY_URL.
 */
export function configureCloudinary(
  cloudName?: string,
  apiKey?: string,
  apiSecret?: string,
  cloudinaryUrl?: string,
) {
  if (cloudinaryUrl && cloudinaryUrl.trim()) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl.trim(),
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName.trim(),
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim(),
      secure: true,
    });
  }
}

/**
 * Upload a file buffer to Cloudinary and return the secure URL.
 * Files are stored under the "zelnk/avatars" folder.
 * Old image is overwritten using public_id = "zelnk/avatars/{userId}".
 *
 * Security measures:
 * - File size is enforced at the Multer middleware level (max 2MB)
 * - Only image MIME types are accepted (validated before this call)
 * - Cloudinary auto-detects format; we do not trust the client-supplied extension
 */
export function uploadToCloudinary(
  buffer: Buffer,
  userId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const publicId = `zelnk/avatars/${userId}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        transformation: [
          { width: 256, height: 256, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'));
        } else {
          resolve(result.secure_url);
        }
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Delete a user's avatar from Cloudinary (called on account deletion).
 */
export async function deleteCloudinaryAvatar(userId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(`zelnk/avatars/${userId}`, {
      resource_type: 'image',
    });
  } catch {
    // Non-fatal — image might not exist
  }
}

