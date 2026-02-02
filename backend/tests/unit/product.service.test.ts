import { ProductService } from "../../src/modules/product/service";
import { ProductRepository } from "../../src/modules/product/repository";
import { AppError } from "../../src/middlewares/error.middleware";

// Mock the repository
jest.mock("../../src/modules/product/repository");

describe("ProductService", () => {
  let service: ProductService;
  let mockRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create service instance
    service = new ProductService();

    // Get mocked repository instance
    mockRepository = (service as any).repository;
  });

  describe("getAllProducts", () => {
    it("should return paginated products with default pagination", async () => {
      const mockProducts: any[] = [
        {
          id: "1",
          name: "Product 1",
          slug: "product-1",
          isActive: true,
          isFeatured: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Product 2",
          slug: "product-2",
          isActive: true,
          isFeatured: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResult: any = {
        items: mockProducts,
        total: 2,
        page: 1,
        limit: 12,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.getAllProducts({}, 1, 12);

      expect(result).toEqual(mockResult);
      expect(mockRepository.findAll).toHaveBeenCalledWith({}, 1, 12);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it("should apply category filter", async () => {
      const mockResult: any = {
        items: [],
        total: 0,
        page: 1,
        limit: 12,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const filters = { category: "electronics" };
      await service.getAllProducts(filters, 1, 12);

      expect(mockRepository.findAll).toHaveBeenCalledWith(filters, 1, 12);
    });

    it("should apply multiple filters (category, brand, search)", async () => {
      const mockResult: any = {
        items: [],
        total: 0,
        page: 1,
        limit: 12,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const filters = {
        category: "electronics",
        brand: ["samsung", "lg"],
        search: "smart tv",
        featured: true,
      };

      await service.getAllProducts(filters, 2, 20);

      expect(mockRepository.findAll).toHaveBeenCalledWith(filters, 2, 20);
    });

    it("should handle empty results", async () => {
      const mockResult: any = {
        items: [],
        total: 0,
        page: 1,
        limit: 12,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.getAllProducts({});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getProductById", () => {
    it("should return product when found", async () => {
      const mockProduct = {
        id: "123",
        name: "Test Product",
        slug: "test-product",
        isActive: true,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockProduct as any);

      const result = await service.getProductById("123");

      expect(result).toEqual(mockProduct);
      expect(mockRepository.findById).toHaveBeenCalledWith("123");
    });

    it("should throw 404 error when product not found", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getProductById("999")).rejects.toThrow(AppError);
      await expect(service.getProductById("999")).rejects.toThrow(
        "Product not found",
      );
    });

    it("should throw error with correct status code", async () => {
      mockRepository.findById.mockResolvedValue(null);

      try {
        await service.getProductById("999");
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }
    });
  });

  describe("getProductBySlug", () => {
    it("should return product when found by slug", async () => {
      const mockProduct = {
        id: "123",
        name: "Test Product",
        slug: "test-product",
        isActive: true,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findBySlug.mockResolvedValue(mockProduct as any);

      const result = await service.getProductBySlug("test-product");

      expect(result).toEqual(mockProduct);
      expect(mockRepository.findBySlug).toHaveBeenCalledWith("test-product");
    });

    it("should throw 404 error when product not found by slug", async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      await expect(service.getProductBySlug("non-existent")).rejects.toThrow(
        AppError,
      );
      await expect(service.getProductBySlug("non-existent")).rejects.toThrow(
        "Product not found",
      );
    });
  });

  describe("createProduct", () => {
    it("should create product with auto-generated slug from name", async () => {
      const productData = {
        name: "New Product",
        description: "Test description",
      };

      const mockCreatedProduct = {
        id: "new-id",
        ...productData,
        slug: "new-product",
        isActive: true,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findBySlug.mockResolvedValue(null); // Slug is available
      mockRepository.create.mockResolvedValue(mockCreatedProduct as any);

      const result = await service.createProduct(productData);

      expect(result.slug).toBe("new-product");
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Product",
          slug: "new-product",
        }),
      );
    });

    it("should slugify product name correctly", async () => {
      const productData = {
        name: "Product With Spaces & Special-Chars!",
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "1",
        slug: "product-with-spaces-special-chars",
      } as any);

      await service.createProduct(productData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "product-with-spaces-special-chars",
        }),
      );
    });

    it("should use provided slug if given", async () => {
      const productData = {
        name: "Product Name",
        slug: "custom-slug",
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "1",
        slug: "custom-slug",
      } as any);

      await service.createProduct(productData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "custom-slug",
        }),
      );
    });

    it("should throw 409 error if provided slug already exists", async () => {
      const productData = {
        name: "Product Name",
        slug: "existing-slug",
      };

      mockRepository.findBySlug.mockResolvedValue({
        id: "existing-id",
        slug: "existing-slug",
      } as any);

      await expect(service.createProduct(productData)).rejects.toThrow(
        AppError,
      );

      await expect(service.createProduct(productData)).rejects.toThrow(
        "Product with this slug already exists",
      );

      try {
        await service.createProduct(productData);
      } catch (error) {
        expect((error as AppError).statusCode).toBe(409);
      }
    });

    it("should generate unique slug if auto-generated one exists", async () => {
      const productData = {
        name: "Product",
      };

      // First call returns existing product, subsequent calls return null
      mockRepository.findBySlug
        .mockResolvedValueOnce({ id: "existing", slug: "product" } as any)
        .mockResolvedValueOnce(null);

      mockRepository.create.mockResolvedValue({
        id: "new",
        slug: "product-2",
      } as any);

      await service.createProduct(productData);

      expect(mockRepository.findBySlug).toHaveBeenCalledWith("product");
      expect(mockRepository.findBySlug).toHaveBeenCalledWith("product-2");
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "product-2",
        }),
      );
    });

    it("should include model in slug generation if provided", async () => {
      const productData = {
        name: "Samsung TV",
        model: "UN55",
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "1",
        slug: "samsung-tv-un55",
      } as any);

      await service.createProduct(productData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "samsung-tv-un55",
        }),
      );
    });

    it("should pass all product data to repository", async () => {
      const productData = {
        name: "Complete Product",
        model: "ABC123",
        categoryId: "cat-1",
        brandId: "brand-1",
        description: "Full description",
        keyFeatures: "Feature 1, Feature 2",
        image: "/images/product.jpg",
        images: '["image1.jpg", "image2.jpg"]',
        datasheetUrl: "/docs/datasheet.pdf",
        isFeatured: true,
        specs: [
          { specKey: "color", specValue: "red", displayOrder: 1 },
          { specKey: "size", specValue: "large", displayOrder: 2 },
        ],
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({ id: "1" } as any);

      await service.createProduct(productData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Complete Product",
          model: "ABC123",
          categoryId: "cat-1",
          brandId: "brand-1",
          description: "Full description",
          keyFeatures: "Feature 1, Feature 2",
          image: "/images/product.jpg",
          isFeatured: true,
        }),
      );
    });
  });

  describe("updateProduct", () => {
    it("should update product successfully", async () => {
      const existingProduct = {
        id: "123",
        name: "Old Name",
        slug: "old-slug",
      };

      const updateData = {
        name: "New Name",
        description: "Updated description",
      };

      mockRepository.findById.mockResolvedValue(existingProduct as any);
      mockRepository.update.mockResolvedValue({
        ...existingProduct,
        ...updateData,
      } as any);

      const result = await service.updateProduct("123", updateData);

      expect(mockRepository.findById).toHaveBeenCalledWith("123");
      expect(mockRepository.update).toHaveBeenCalledWith("123", updateData);
      expect(result.name).toBe("New Name");
    });

    it("should throw 404 if product to update does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateProduct("999", { name: "New Name" }),
      ).rejects.toThrow("Product not found");

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("should slugify new slug if provided", async () => {
      const existingProduct = {
        id: "123",
        slug: "old-slug",
      };

      mockRepository.findById.mockResolvedValue(existingProduct as any);
      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue({} as any);

      await service.updateProduct("123", { slug: "New Slug!!" });

      expect(mockRepository.update).toHaveBeenCalledWith(
        "123",
        expect.objectContaining({
          slug: "new-slug",
        }),
      );
    });

    it("should throw 409 if new slug already taken by another product", async () => {
      mockRepository.findById.mockResolvedValue({ id: "123" } as any);
      mockRepository.findBySlug.mockResolvedValue({
        id: "456",
        slug: "taken-slug",
      } as any);

      await expect(
        service.updateProduct("123", { slug: "taken-slug" }),
      ).rejects.toThrow("Product with this slug already exists");

      try {
        await service.updateProduct("123", { slug: "taken-slug" });
      } catch (error) {
        expect((error as AppError).statusCode).toBe(409);
      }
    });

    it("should allow updating to same slug (same product)", async () => {
      const product = {
        id: "123",
        slug: "existing-slug",
      };

      mockRepository.findById.mockResolvedValue(product as any);
      mockRepository.findBySlug.mockResolvedValue(product as any);
      mockRepository.update.mockResolvedValue(product as any);

      await service.updateProduct("123", { slug: "existing-slug" });

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it("should handle partial updates", async () => {
      mockRepository.findById.mockResolvedValue({ id: "123" } as any);
      mockRepository.update.mockResolvedValue({} as any);

      await service.updateProduct("123", { isFeatured: true });

      expect(mockRepository.update).toHaveBeenCalledWith("123", {
        isFeatured: true,
      });
    });

    it("should not modify slug if not provided in update", async () => {
      mockRepository.findById.mockResolvedValue({ id: "123" } as any);
      mockRepository.update.mockResolvedValue({} as any);

      await service.updateProduct("123", { name: "Updated Name" });

      expect(mockRepository.findBySlug).not.toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalledWith("123", {
        name: "Updated Name",
      });
    });
  });

  describe("deleteProduct", () => {
    it("should delete product successfully", async () => {
      mockRepository.findById.mockResolvedValue({
        id: "123",
        name: "Product to delete",
      } as any);
      mockRepository.delete.mockResolvedValue(undefined as any);

      await service.deleteProduct("123");

      expect(mockRepository.findById).toHaveBeenCalledWith("123");
      expect(mockRepository.delete).toHaveBeenCalledWith("123");
    });

    it("should throw 404 if product to delete does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deleteProduct("999")).rejects.toThrow(
        "Product not found",
      );

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it("should not return any value", async () => {
      mockRepository.findById.mockResolvedValue({ id: "123" } as any);
      mockRepository.delete.mockResolvedValue(undefined as any);

      const result = await service.deleteProduct("123");

      expect(result).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string slug", async () => {
      const productData = {
        name: "Product",
        slug: "   ",
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({ id: "1" } as any);

      await service.createProduct(productData);

      // Should fall back to auto-generated slug from name
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "product",
        }),
      );
    });

    it("should handle special characters in product name", async () => {
      const productData = {
        name: "Product @ #$% Name & Co.'s Item",
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({ id: "1" } as any);

      await service.createProduct(productData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expect.stringMatching(/^[a-z0-9-]+$/),
        }),
      );
    });

    it("should handle very long product names", async () => {
      const longName = "A".repeat(200);
      const productData = {
        name: longName,
      };

      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({ id: "1" } as any);

      await service.createProduct(productData);

      expect(mockRepository.create).toHaveBeenCalled();
      const slug = mockRepository.create.mock.calls[0][0].slug;
      expect(slug).toBeTruthy();
      expect(typeof slug).toBe("string");
    });
  });
});
