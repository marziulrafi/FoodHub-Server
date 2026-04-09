import prisma from "../../config/prisma";
import { getPaginationParams } from "../../utils/response";

interface CreateReviewInput {
  orderId: string;
  mealId: string;
  rating: number;
  comment?: string;
}

export class ReviewService {
  async getByMeal(mealId: string, page?: string, limit?: string) {
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const [reviews, total, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { mealId },
        include: { customer: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where: { mealId } }),
      prisma.review.aggregate({
        where: { mealId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      reviews,
      total,
      page: pageNum,
      limit: limitNum,
      averageRating: aggregate._avg.rating
        ? Math.round(aggregate._avg.rating * 10) / 10
        : 0,
      totalReviews: aggregate._count.rating,
    };
  }

  async create(userId: string, input: CreateReviewInput) {
    const { orderId, mealId, rating, comment } = input;

    const meal = await prisma.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw { statusCode: 404, message: "Meal not found." };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.customerId !== userId) {
      throw { statusCode: 404, message: "Order not found." };
    }

    if (order.status !== "DELIVERED") {
      throw {
        statusCode: 400,
        message: "You can only review meals from orders that have been delivered.",
      };
    }

    const itemInOrder = order.items.some((item) => item.mealId === mealId);
    if (!itemInOrder) {
      throw {
        statusCode: 400,
        message: "This meal is not part of the selected order.",
      };
    }

    const existing = await prisma.review.findUnique({
      where: { orderId_mealId: { orderId, mealId } },
    });
    if (existing) {
      throw {
        statusCode: 409,
        message: "You have already reviewed this meal for this order.",
      };
    }

    const review = await prisma.review.create({
      data: {
        userId,
        mealId,
        orderId,
        rating,
        comment: comment ?? null,
      },
      include: { customer: { select: { name: true, image: true } } },
    });

    await this._recalculateMealRating(mealId);
    return review;
  }

  async update(userId: string, reviewId: string, data: { rating?: number; comment?: string }) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw { statusCode: 404, message: "Review not found." };
    if (review.userId !== userId) throw { statusCode: 403, message: "You cannot edit someone else's review." };

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data,
      include: { customer: { select: { name: true, image: true } } },
    });

    await this._recalculateMealRating(review.mealId);
    return updated;
  }

  async delete(requesterId: string, requesterRole: string, reviewId: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw { statusCode: 404, message: "Review not found." };

    if (review.userId !== requesterId && requesterRole !== "ADMIN") {
      throw { statusCode: 403, message: "You cannot delete someone else's review." };
    }

    await prisma.review.delete({ where: { id: reviewId } });
    await this._recalculateMealRating(review.mealId);
  }

  private async _recalculateMealRating(mealId: string) {
    const meal = await prisma.meal.findUnique({ where: { id: mealId }, select: { providerId: true } });
    if (!meal) return;

    const { _avg, _count } = await prisma.review.aggregate({
      where: { mealId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.meal.update({
      where: { id: mealId },
      data: {
        rating: _avg.rating ? Math.round(_avg.rating * 10) / 10 : 0,
        totalReviews: _count.rating,
      },
    });

    await this._recalculateProviderRating(meal.providerId);
  }

  private async _recalculateProviderRating(providerId: string) {
    const { _avg } = await prisma.review.aggregate({
      where: { meal: { providerId } },
      _avg: { rating: true },
    });

    await prisma.providerProfile.update({
      where: { id: providerId },
      data: {
        rating: _avg.rating ? Math.round(_avg.rating * 10) / 10 : 0,
      },
    });
  }
}

export const reviewService = new ReviewService();
