import { Response } from 'express';
import { AuthRequest } from '../../types';
import { createImage, getImagesByUserId, getImageByPublicId, deleteImage } from './images.service';
import { sendResponse } from '../../utils/response';

export const uploadImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, 'Unauthorized', null);
      return;
    }

    const { secure_url, public_id } = req.body;

    if (!secure_url || !public_id) {
      sendResponse(res, 400, 'Missing required fields: secure_url, public_id', null);
      return;
    }

    const image = await createImage({
      url: secure_url,
      publicId: public_id,
      userId,
    });

    sendResponse(res, 201, 'Image uploaded successfully', image);
  } catch (error) {
    console.error('Error uploading image:', error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    sendResponse(res, statusCode, message, null);
  }
};

export const getUserImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, 'Unauthorized', null);
      return;
    }

    const images = await getImagesByUserId(userId);

    sendResponse(res, 200, 'Images fetched successfully', images);
  } catch (error) {
    console.error('Error fetching images:', error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch images';
    sendResponse(res, statusCode, message, null);
  }
};

export const getImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const publicId = Array.isArray(req.params.publicId)
      ? req.params.publicId[0]
      : req.params.publicId;

    if (!publicId) {
      sendResponse(res, 400, 'Public ID is required', null);
      return;
    }

    const image = await getImageByPublicId(publicId);

    if (!image) {
      sendResponse(res, 404, 'Image not found', null);
      return;
    }

    sendResponse(res, 200, 'Image fetched successfully', image);
  } catch (error) {
    console.error('Error fetching image:', error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch image';
    sendResponse(res, statusCode, message, null);
  }
};

export const removeImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, 'Unauthorized', null);
      return;
    }

    const publicId = Array.isArray(req.params.publicId)
      ? req.params.publicId[0]
      : req.params.publicId;

    if (!publicId) {
      sendResponse(res, 400, 'Public ID is required', null);
      return;
    }

    const image = await getImageByPublicId(publicId);
    if (!image) {
      sendResponse(res, 404, 'Image not found', null);
      return;
    }

    if (image.userId !== userId) {
      sendResponse(res, 403, 'Forbidden: Cannot delete other users images', null);
      return;
    }

    const deleted = await deleteImage(publicId);

    sendResponse(res, 200, 'Image deleted successfully', deleted);
  } catch (error) {
    console.error('Error deleting image:', error);
    const statusCode = 500;
    const message = error instanceof Error ? error.message : 'Failed to delete image';
    sendResponse(res, statusCode, message, null);
  }
};
