import prisma from "../../config/prisma";
import { getPaginationParams } from "../../utils/response";

interface CreateReviewInput {
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

  async create(customerId: string, input: CreateReviewInput) {
    const { mealId, rating, comment } = input;

    const meal = await prisma.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw { statusCode: 404, message: "Meal not found." };

    const hasDeliveredOrder = await prisma.order.findFirst({
      where: {
        customerId,
        status: "DELIVERED",
        items: { some: { mealId } },
      },
    });

    if (!hasDeliveredOrder) {
      throw {
        statusCode: 400,
        message: "You can only review meals from orders that have been delivered.",
      };
    }

    const existing = await prisma.review.findUnique({
      where: { customerId_mealId: { customerId, mealId } },
    });
    if (existing) throw { statusCode: 409, message: "You have already reviewed this meal." };

    const review = await prisma.review.create({
      data: { customerId, mealId, rating, comment },
      include: { customer: { select: { name: true, image: true } } },
    });

    await this._recalculateMealRating(mealId);
    return review;
  }

  async update(customerId: string, reviewId: string, data: { rating?: number; comment?: string }) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw { statusCode: 404, message: "Review not found." };
    if (review.customerId !== customerId) throw { statusCode: 403, message: "You cannot edit someone else's review." };

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

    if (review.customerId !== requesterId && requesterRole !== "ADMIN") {
      throw { statusCode: 403, message: "You cannot delete someone else's review." };
    }

    await prisma.review.delete({ where: { id: reviewId } });
    await this._recalculateMealRating(review.mealId);
  }

  private async _recalculateMealRating(mealId: string) {
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
  }
}

export const reviewService = new ReviewService();
