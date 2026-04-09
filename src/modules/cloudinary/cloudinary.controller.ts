import { Response } from 'express';
import { AuthRequest } from '../../types';
import { generateUploadSignature } from './cloudinary.service';
import { sendResponse } from '../../utils/response';

export const getUploadSignature = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const signatureData = generateUploadSignature();

    sendResponse(res, 200, 'Upload signature generated successfully', signatureData);
  } catch (error) {
    console.error('Error generating upload signature:', error);
    const statusCode = 500;
    const message =
      error instanceof Error ? error.message : 'Failed to generate upload signature';
    sendResponse(res, statusCode, message, null);
  }
};
