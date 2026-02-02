import { prisma } from "../../config/db";
import { Brand } from "@prisma/client";

/**
 * Brand creation/update data structure
 */
interface CreateBrandData {
  name: string;           // Brand display name
  slug: string;           // URL-safe identifier
  logo?: string;          // Logo image URL/path
  description?: string;   // Brand description text
  website?: string;       // Brand official website
  isAuthorized?: boolean; // Authorized distributor status
  displayOrder?: number;  // Sort order for display
}

/**
 * Brand Repository
 *
 * Database access layer for brand operations.
 * Manages manufacturer/brand data with authorized distributor status.
 *
 * **Ordering Strategy:**
 * - Primary: displayOrder (ascending) - admin-controlled
 * - Secondary: name (alphabetical) - for same displayOrder
 *
 * **Active/Inactive Filtering:**
 * - Default: Returns only isActive = true brands
 * - includeInactive: Admin panels can show all brands
 *
 * **Authorized Distributor:**
 * - isAuthorized flag indicates official partnership
 * - Can be used in UI to highlight trusted brands
 * - Helps customers identify official channels
 *
 * **Use Cases:**
 * - Public website: Show active authorized brands prominently
 * - Product filtering: Filter products by brand slug
 * - Admin management: CRUD operations for brand catalog
 */
export class BrandRepository {
  async findAll(includeInactive: boolean = false): Promise<Brand[]> {
    return prisma.brand.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
  }

  async findById(id: string): Promise<Brand | null> {
    return prisma.brand.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    return prisma.brand.findUnique({
      where: { slug },
    });
  }

  async create(data: CreateBrandData): Promise<Brand> {
    return prisma.brand.create({
      data,
    });
  }

  async update(id: string, data: Partial<CreateBrandData>): Promise<Brand> {
    return prisma.brand.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Brand> {
    return prisma.brand.delete({
      where: { id },
    });
  }
}
