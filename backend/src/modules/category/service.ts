import { CategoryRepository } from "./repository";
import { Category } from "@prisma/client";
import { AppError } from "../../middlewares/error.middleware";

interface CreateCategoryData {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  displayOrder?: number;
}

export class CategoryService {
  private repository: CategoryRepository;

  constructor() {
    this.repository = new CategoryRepository();
  }

  async getAllCategories(
    includeInactive: boolean = false,
  ): Promise<Category[]> {
    return this.repository.findAll(includeInactive);
  }

  async getCategoryById(id: string): Promise<Category> {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new AppError(404, "Category not found");
    }

    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category> {
    const category = await this.repository.findBySlug(slug);

    if (!category) {
      throw new AppError(404, "Category not found");
    }

    return category;
  }

  async createCategory(data: CreateCategoryData): Promise<Category> {
    // Check if slug already exists
    const existing = await this.repository.findBySlug(data.slug);
    if (existing) {
      throw new AppError(409, "Category with this slug already exists");
    }

    return this.repository.create(data);
  }

  async updateCategory(
    id: string,
    data: Partial<CreateCategoryData>,
  ): Promise<Category> {
    // Check if category exists
    await this.getCategoryById(id);

    // Check if slug is being updated and if it's already taken
    if (data.slug) {
      const existing = await this.repository.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, "Category with this slug already exists");
      }
    }

    return this.repository.update(id, data);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.getCategoryById(id);
    await this.repository.delete(id);
  }
}
