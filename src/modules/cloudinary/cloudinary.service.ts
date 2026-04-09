import { v2 as cloudinary } from 'cloudinary';

interface SignatureResponse {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
}

export const generateUploadSignature = (): SignatureResponse => {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary API key or cloud name is not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'unsigned',
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
};
