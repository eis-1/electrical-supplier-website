// API Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Category Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Brand Types
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  isAuthorized: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  slug: string;
  model?: string;
  categoryId?: string;
  brandId?: string;
  description?: string;
  keyFeatures?: string | string[];
  image?: string;
  images?: string | string[];
  datasheetUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  brand?: Brand;
  specs?: ProductSpec[];
}

export interface ProductSpec {
  id: string;
  productId: string;
  specKey: string;
  specValue: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Quote Types
export interface QuoteRequest {
  name: string;
  company?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  productName?: string;
  quantity?: string;
  projectDetails?: string;
}

export interface Quote extends QuoteRequest {
  id: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

// Filter Types
export interface ProductFilters {
  category?: string;
  brand?: string | string[];
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}
