import prisma from "../../config/prisma";

interface CategoryInput {
  name: string;
  description?: string;
  image?: string;
}

const slugify = (text: string) =>
  text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

export class CategoryService {
  async getAll() {
    return prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { meals: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getAllForAdmin() {
    return prisma.category.findMany({
      include: { _count: { select: { meals: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        meals: {
          where: { isAvailable: true },
          include: {
            provider: { select: { restaurantName: true, rating: true } },
          },
          take: 20,
        },
        _count: { select: { meals: true } },
      },
    });
    if (!category) throw { statusCode: 404, message: "Category not found." };
    return category;
  }

  async create(data: CategoryInput) {
    const existing = await prisma.category.findFirst({ where: { name: data.name } });
    if (existing) throw { statusCode: 409, message: "Category with this name already exists." };

    return prisma.category.create({
      data: { ...data, slug: slugify(data.name) },
    });
  }

  async update(id: string, data: Partial<CategoryInput>) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw { statusCode: 404, message: "Category not found." };

    const updateData: any = { ...data };
    if (data.name) updateData.slug = slugify(data.name);

    return prisma.category.update({ where: { id }, data: updateData });
  }

  async toggleActive(id: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw { statusCode: 404, message: "Category not found." };

    return prisma.category.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  async delete(id: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw { statusCode: 404, message: "Category not found." };

    const mealCount = await prisma.meal.count({ where: { categoryId: id } });
    if (mealCount > 0) {
      throw { statusCode: 400, message: `Cannot delete category with ${mealCount} associated meal(s). Reassign meals first.` };
    }

    await prisma.category.delete({ where: { id } });
  }
}

export const categoryService = new CategoryService();
