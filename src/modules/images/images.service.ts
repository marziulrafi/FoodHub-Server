import { prisma } from '../../config/prisma';

interface CreateImageInput {
  url: string;
  publicId: string;
  userId: string;
}

export const createImage = async (data: CreateImageInput) => {
  try {
    const image = await prisma.image.create({
      data: {
        url: data.url,
        publicId: data.publicId,
        userId: data.userId,
      },
    });

    return image;
  } catch (error) {
    console.error('Error creating image record:', error);
    throw error;
  }
};

export const getImagesByUserId = async (userId: string) => {
  try {
    const images = await prisma.image.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return images;
  } catch (error) {
    console.error('Error fetching user images:', error);
    throw error;
  }
};

export const getImageByPublicId = async (publicId: string) => {
  try {
    const image = await prisma.image.findUnique({
      where: { publicId },
    });

    return image;
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

export const deleteImage = async (publicId: string) => {
  try {
    const image = await prisma.image.delete({
      where: { publicId },
    });

    return image;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
