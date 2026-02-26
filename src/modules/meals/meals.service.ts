import prisma from "../../config/prisma";
import { getPaginationParams } from "../../utils/response";
import { SpiceLevel } from "@prisma/client";

interface MealFilters {
  page?: string;
  limit?: string;
  category?: string;
  providerId?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  isVegetarian?: string;
  isVegan?: string;
  isGlutenFree?: string;
  sortBy?: string;
  order?: string;
}

interface MealInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image?: string;
  images?: string[];
  isAvailable?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: SpiceLevel;
  prepTime?: number;
  calories?: number;
}

export class MealService {
  async getAll(filters: MealFilters) {
    const { page, limit, category, providerId, search, minPrice, maxPrice, isVegetarian, isVegan, isGlutenFree, sortBy = "createdAt", order = "desc" } = filters;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const where: any = { isAvailable: true };
    if (category) where.categoryId = category;
    if (providerId) where.providerId = providerId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (isVegetarian === "true") where.isVegetarian = true;
    if (isVegan === "true") where.isVegan = true;
    if (isGlutenFree === "true") where.isGlutenFree = true;

    const validSortFields = ["price", "rating", "createdAt", "name"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const [meals, total] = await Promise.all([
      prisma.meal.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, restaurantName: true, city: true, rating: true, logo: true } },
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.meal.count({ where }),
    ]);

    return { meals, total, page: pageNum, limit: limitNum };
  }

  async getFeatured() {
    return prisma.meal.findMany({
      where: { isAvailable: true, rating: { gte: 4 } },
      include: {
        category: { select: { name: true } },
        provider: { select: { restaurantName: true, city: true, logo: true } },
      },
      orderBy: { rating: "desc" },
      take: 8,
    });
  }

  async getById(id: string) {
    const meal = await prisma.meal.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
          select: {
            id: true,
            restaurantName: true,
            description: true,
            logo: true,
            city: true,
            address: true,
            phone: true,
            rating: true,
            totalOrders: true,
            isVerified: true,
            cuisineTypes: true,
          },
        },
        reviews: {
          include: { customer: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { reviews: true } },
      },
    });
    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    return meal;
  }

  async getProviderMeals(userId: string, page?: string, limit?: string) {
    const profile = await this._getProviderProfile(userId);
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const [meals, total] = await Promise.all([
      prisma.meal.findMany({
        where: { providerId: profile.id },
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { orderItems: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.meal.count({ where: { providerId: profile.id } }),
    ]);

    return { meals, total, page: pageNum, limit: limitNum };
  }

  async create(userId: string, data: MealInput) {
    const profile = await this._getProviderProfile(userId);

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw { statusCode: 404, message: "Category not found." };
    if (!category.isActive) throw { statusCode: 400, message: "Selected category is inactive." };

    return prisma.meal.create({
      data: { ...data, providerId: profile.id },
      include: {
        category: { select: { name: true } },
        provider: { select: { restaurantName: true } },
      },
    });
  }

  async update(userId: string, mealId: string, data: Partial<MealInput>) {
    const profile = await this._getProviderProfile(userId);
    const meal = await prisma.meal.findUnique({ where: { id: mealId } });

    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    if (meal.providerId !== profile.id) throw { statusCode: 403, message: "You do not own this meal." };

    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw { statusCode: 404, message: "Category not found." };
    }

    return prisma.meal.update({
      where: { id: mealId },
      data,
      include: { category: { select: { name: true } } },
    });
  }

  async toggleAvailability(userId: string, mealId: string) {
    const profile = await this._getProviderProfile(userId);
    const meal = await prisma.meal.findUnique({ where: { id: mealId } });

    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    if (meal.providerId !== profile.id) throw { statusCode: 403, message: "You do not own this meal." };

    return prisma.meal.update({
      where: { id: mealId },
      data: { isAvailable: !meal.isAvailable },
    });
  }

  async delete(userId: string, mealId: string) {
    const profile = await this._getProviderProfile(userId);
    const meal = await prisma.meal.findUnique({ where: { id: mealId } });

    if (!meal) throw { statusCode: 404, message: "Meal not found." };
    if (meal.providerId !== profile.id) throw { statusCode: 403, message: "You do not own this meal." };

    await prisma.meal.delete({ where: { id: mealId } });
  }

  private async _getProviderProfile(userId: string) {
    const profile = await prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw { statusCode: 404, message: "Provider profile not found. Please complete your profile." };
    return profile;
  }
}

export const mealService = new MealService();
