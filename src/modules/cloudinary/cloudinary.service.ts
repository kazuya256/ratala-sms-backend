import { Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
const streamifier = require('streamifier');

@Injectable()
export class CloudinaryService {
  constructor() {}

  uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'school_assets',
          use_filename: true,
          unique_filename: true,
          access_mode: 'public',
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload failed'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  getDownloadUrl(publicId: string, resourceType: string = 'image'): string {
    // Correctly handle the format (e.g., pdf)
    const format = 'pdf';

    // Official Cloudinary high-level method for generating private, signed download links
    // This handles all signature complexities automatically
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: 'upload',
      attachment: true,
    });
  }
}

export { cloudinary };
