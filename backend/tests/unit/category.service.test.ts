import { CategoryService } from "../../src/modules/category/service";
import { CategoryRepository } from "../../src/modules/category/repository";
import { AppError } from "../../src/middlewares/error.middleware";

// Mock the repository
jest.mock("../../src/modules/category/repository");

describe("CategoryService", () => {
  let service: CategoryService;
  let mockRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new CategoryRepository() as jest.Mocked<CategoryRepository>;
    service = new CategoryService();
    (service as any).repository = mockRepository;
  });

  describe("getAllCategories", () => {
    it("should return only active categories by default", async () => {
      const mockCategories: any[] = [
        {
          id: "1",
          name: "Switches",
          slug: "switches",
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Cables",
          slug: "cables",
          isActive: true,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findAll.mockResolvedValue(mockCategories);

      const result = await service.getAllCategories();

      expect(mockRepository.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual(mockCategories);
      expect(result).toHaveLength(2);
    });

    it("should return all categories including inactive when requested", async () => {
      const mockCategories: any[] = [
        {
          id: "1",
          name: "Active Category",
          slug: "active",
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Inactive Category",
          slug: "inactive",
          isActive: false,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findAll.mockResolvedValue(mockCategories);

      const result = await service.getAllCategories(true);

      expect(mockRepository.findAll).toHaveBeenCalledWith(true);
      expect(result).toEqual(mockCategories);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no categories exist", async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.getAllCategories();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("getCategoryById", () => {
    it("should return category when found", async () => {
      const mockCategory: any = {
        id: "123",
        name: "Switches",
        slug: "switches",
        isActive: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockCategory);

      const result = await service.getCategoryById("123");

      expect(mockRepository.findById).toHaveBeenCalledWith("123");
      expect(result).toEqual(mockCategory);
    });

    it("should throw 404 error when category not found", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getCategoryById("nonexistent")).rejects.toThrow(
        AppError,
      );
      await expect(service.getCategoryById("nonexistent")).rejects.toThrow(
        "Category not found",
      );

      try {
        await service.getCategoryById("nonexistent");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }
    });
  });

  describe("getCategoryBySlug", () => {
    it("should return category when found by slug", async () => {
      const mockCategory: any = {
        id: "123",
        name: "Switches",
        slug: "switches",
        isActive: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findBySlug.mockResolvedValue(mockCategory);

      const result = await service.getCategoryBySlug("switches");

      expect(mockRepository.findBySlug).toHaveBeenCalledWith("switches");
      expect(result).toEqual(mockCategory);
    });

    it("should throw 404 error when category not found by slug", async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      await expect(
        service.getCategoryBySlug("nonexistent-slug"),
      ).rejects.toThrow(AppError);
      await expect(
        service.getCategoryBySlug("nonexistent-slug"),
      ).rejects.toThrow("Category not found");

      try {
        await service.getCategoryBySlug("nonexistent-slug");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }
    });
  });

  describe("createCategory", () => {
    it("should create category successfully with all fields", async () => {
      const categoryData = {
        name: "New Category",
        slug: "new-category",
        icon: "fa-bolt",
        description: "Category description",
        displayOrder: 10,
      };

      const mockCreatedCategory: any = {
        id: "new-123",
        ...categoryData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCreatedCategory);

      const result = await service.createCategory(categoryData);

      expect(mockRepository.findBySlug).toHaveBeenCalledWith("new-category");
      expect(mockRepository.create).toHaveBeenCalledWith(categoryData);
      expect(result).toEqual(mockCreatedCategory);
    });

    it("should create category with only required fields", async () => {
      const categoryData = {
        name: "Minimal Category",
        slug: "minimal-category",
      };

      const mockCreatedCategory: any = {
        id: "min-123",
        ...categoryData,
        isActive: true,
        icon: null,
        description: null,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCreatedCategory);

      const result = await service.createCategory(categoryData);

      expect(result).toEqual(mockCreatedCategory);
    });

    it("should throw 409 error if slug already exists", async () => {
      const existingCategory: any = {
        id: "existing-123",
        name: "Existing Category",
        slug: "existing-slug",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findBySlug.mockResolvedValue(existingCategory);

      const categoryData = {
        name: "New Category",
        slug: "existing-slug",
      };

      await expect(service.createCategory(categoryData)).rejects.toThrow(
        AppError,
      );
      await expect(service.createCategory(categoryData)).rejects.toThrow(
        "Category with this slug already exists",
      );

      try {
        await service.createCategory(categoryData);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(409);
      }

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateCategory", () => {
    it("should update category successfully", async () => {
      const existingCategory: any = {
        id: "123",
        name: "Old Name",
        slug: "old-slug",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        name: "New Name",
        description: "Updated description",
      };

      const mockUpdatedCategory: any = {
        ...existingCategory,
        ...updateData,
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingCategory);
      mockRepository.update.mockResolvedValue(mockUpdatedCategory);

      const result = await service.updateCategory("123", updateData);

      expect(mockRepository.findById).toHaveBeenCalledWith("123");
      expect(mockRepository.update).toHaveBeenCalledWith("123", updateData);
      expect(result).toEqual(mockUpdatedCategory);
    });

    it("should throw 404 if category to update does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      const updateData = { name: "New Name" };

      await expect(
        service.updateCategory("nonexistent", updateData),
      ).rejects.toThrow(AppError);
      await expect(
        service.updateCategory("nonexistent", updateData),
      ).rejects.toThrow("Category not found");

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("should update category slug if new slug is unique", async () => {
      const existingCategory: any = {
        id: "123",
        name: "Category",
        slug: "old-slug",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = { slug: "new-unique-slug" };

      const mockUpdatedCategory: any = {
        ...existingCategory,
        ...updateData,
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingCategory);
      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(mockUpdatedCategory);

      const result = await service.updateCategory("123", updateData);

      expect(mockRepository.findBySlug).toHaveBeenCalledWith("new-unique-slug");
      expect(result.slug).toBe("new-unique-slug");
    });

    it("should throw 409 if new slug is already taken by another category", async () => {
      const existingCategory: any = {
        id: "123",
        name: "Category 1",
        slug: "category-1",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conflictingCategory: any = {
        id: "456",
        name: "Category 2",
        slug: "category-2",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingCategory);
      mockRepository.findBySlug.mockResolvedValue(conflictingCategory);

      const updateData = { slug: "category-2" };

      await expect(service.updateCategory("123", updateData)).rejects.toThrow(
        AppError,
      );
      await expect(service.updateCategory("123", updateData)).rejects.toThrow(
        "Category with this slug already exists",
      );

      try {
        await service.updateCategory("123", updateData);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(409);
      }

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("should allow updating to same slug (same category)", async () => {
      const existingCategory: any = {
        id: "123",
        name: "Category",
        slug: "same-slug",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        slug: "same-slug",
        name: "Updated Name",
      };

      const mockUpdatedCategory: any = {
        ...existingCategory,
        name: "Updated Name",
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingCategory);
      mockRepository.findBySlug.mockResolvedValue(existingCategory);
      mockRepository.update.mockResolvedValue(mockUpdatedCategory);

      const result = await service.updateCategory("123", updateData);

      expect(result.name).toBe("Updated Name");
      expect(mockRepository.update).toHaveBeenCalledWith("123", updateData);
    });

    it("should handle partial updates", async () => {
      const existingCategory: any = {
        id: "123",
        name: "Category",
        slug: "category",
        icon: "old-icon",
        description: "Old description",
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = { displayOrder: 5 };

      const mockUpdatedCategory: any = {
        ...existingCategory,
        displayOrder: 5,
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingCategory);
      mockRepository.update.mockResolvedValue(mockUpdatedCategory);

      const result = await service.updateCategory("123", updateData);

      expect(result.displayOrder).toBe(5);
      expect(result.name).toBe("Category");
    });
  });

  describe("deleteCategory", () => {
    it("should delete category successfully", async () => {
      const mockCategory: any = {
        id: "123",
        name: "Category to delete",
        slug: "delete-me",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockCategory);
      mockRepository.delete.mockResolvedValue(undefined as any);

      await service.deleteCategory("123");

      expect(mockRepository.findById).toHaveBeenCalledWith("123");
      expect(mockRepository.delete).toHaveBeenCalledWith("123");
    });

    it("should throw 404 if category to delete does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deleteCategory("nonexistent")).rejects.toThrow(
        AppError,
      );
      await expect(service.deleteCategory("nonexistent")).rejects.toThrow(
        "Category not found",
      );

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it("should not return any value", async () => {
      mockRepository.findById.mockResolvedValue({ id: "123" } as any);
      mockRepository.delete.mockResolvedValue(undefined as any);

      const result = await service.deleteCategory("123");

      expect(result).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string slug in findBySlug", async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      await expect(service.getCategoryBySlug("")).rejects.toThrow(AppError);
    });

    it("should handle special characters in category name", async () => {
      const categoryData = {
        name: "Category & Co. (Ltd.)",
        slug: "category-co-ltd",
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "123",
        ...categoryData,
        isActive: true,
        icon: null,
        description: null,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createCategory(categoryData);

      expect(result.name).toBe("Category & Co. (Ltd.)");
    });

    it("should handle very long category names", async () => {
      const longName = "A".repeat(200);
      const categoryData = {
        name: longName,
        slug: "long-category",
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "123",
        ...categoryData,
        isActive: true,
        icon: null,
        description: null,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createCategory(categoryData);

      expect(result.name).toBe(longName);
    });

    it("should handle negative display order", async () => {
      const categoryData = {
        name: "Negative Order",
        slug: "negative",
        displayOrder: -1,
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "123",
        ...categoryData,
        isActive: true,
        icon: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createCategory(categoryData);

      expect(result.displayOrder).toBe(-1);
    });
  });
});
