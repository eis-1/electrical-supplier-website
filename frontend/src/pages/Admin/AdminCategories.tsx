import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminProducts.module.css';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import SEO from '../../components/common/SEO';
import { categoryService } from '../../services/category.service';
import { brandService } from '../../services/brand.service';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import type { Category, Brand } from '../../types';

interface CategoryFormData {
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
}

interface BrandFormData {
  name: string;
  description: string;
  logo: string;
  isActive: boolean;
}

type TabType = 'categories' | 'brands';

const AdminCategories = () => {
  const navigate = useNavigate();
  const { isLoading: authLoading, logout } = useAdminAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  
  // Form states
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
    slug: '',
    isActive: true,
  });
  
  const [brandForm, setBrandForm] = useState<BrandFormData>({
    name: '',
    description: '',
    logo: '',
    isActive: true,
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, brandsData] = await Promise.all([
        categoryService.getAll(true),
        brandService.getAll(true),
      ]);
      setCategories(categoriesData);
      setBrands(brandsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Category CRUD
  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', slug: '', isActive: true });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      slug: category.slug,
      isActive: category.isActive ?? true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateCategoryForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!categoryForm.name.trim()) errors.name = 'Category name is required';
    if (!categoryForm.slug.trim()) errors.slug = 'Slug is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCategorySubmit = async () => {
    if (!validateCategoryForm()) return;

    setSubmitLoading(true);
    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, categoryForm);
        alert('Category updated successfully!');
      } else {
        await categoryService.create(categoryForm);
        alert('Category created successfully!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;

    try {
      await categoryService.delete(category.id);
      alert('Category deleted successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.message || 'Failed to delete category');
    }
  };

  // Brand CRUD
  const openCreateBrandModal = () => {
    setEditingBrand(null);
    setBrandForm({ name: '', description: '', logo: '', isActive: true });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditBrandModal = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name,
      description: brand.description || '',
      logo: brand.logo || '',
      isActive: brand.isActive ?? true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateBrandForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!brandForm.name.trim()) errors.name = 'Brand name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBrandSubmit = async () => {
    if (!validateBrandForm()) return;

    setSubmitLoading(true);
    try {
      if (editingBrand) {
        await brandService.update(editingBrand.id, brandForm);
        alert('Brand updated successfully!');
      } else {
        await brandService.create(brandForm);
        alert('Brand created successfully!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving brand:', error);
      alert(error.response?.data?.message || 'Failed to save brand');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!window.confirm(`Delete "${brand.name}"? This cannot be undone.`)) return;

    try {
      await brandService.delete(brand.id);
      alert('Brand deleted successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      alert(error.response?.data?.message || 'Failed to delete brand');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const isEditingCategory = editingCategory !== null;
  const isEditingBrand = editingBrand !== null;

  return (
    <div className={styles.adminPage}>
      <SEO title="Categories & Brands Management - Admin" />
      
      <div className={styles.header}>
        <div className="container">
          <div className={styles.headerTop}>
            <Button 
              variant="primary" 
              onClick={() => navigate('/admin/dashboard')}
              className={styles.backToDashboardButton}
            >
              ← Back to Dashboard
            </Button>
          </div>
          <div className={styles.headerContent}>
            <div>
              <h1>Categories & Brands</h1>
              <p>Manage product categorization</p>
            </div>
            <div className={styles.headerActions}>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.pageContent}>
          <div className={styles.statsBar}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total Categories</span>
              <span className={styles.statValue}>{categories.length}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Active Categories</span>
              <span className={styles.statValue}>
                {categories.filter(c => c.isActive).length}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total Brands</span>
              <span className={styles.statValue}>{brands.length}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Active Brands</span>
              <span className={styles.statValue}>
                {brands.filter(b => b.isActive).length}
              </span>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'categories' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              Categories ({categories.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'brands' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('brands')}
            >
              Brands ({brands.length})
            </button>
          </div>

          {activeTab === 'categories' && (
            <>
              <div className={styles.toolbar}>
                <Button onClick={openCreateCategoryModal}>+ Add New Category</Button>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td>
                          <span className={styles.productName}>{category.name}</span>
                        </td>
                        <td><code>{category.slug}</code></td>
                        <td>{category.description || '—'}</td>
                        <td>
                          <span className={`${styles.badge} ${category.isActive ? styles.badgeSuccess : styles.badgeDefault}`}>
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.btnEdit}
                              onClick={() => openEditCategoryModal(category)}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.btnDelete}
                              onClick={() => handleDeleteCategory(category)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {categories.length === 0 && (
                  <div className={styles.emptyState}>
                    <p>No categories found. Create your first category!</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'brands' && (
            <>
              <div className={styles.toolbar}>
                <Button onClick={openCreateBrandModal}>+ Add New Brand</Button>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Logo URL</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map((brand) => (
                      <tr key={brand.id}>
                        <td>
                          <span className={styles.productName}>{brand.name}</span>
                        </td>
                        <td>{brand.description || '—'}</td>
                        <td>{brand.logo ? <a href={brand.logo} target="_blank" rel="noopener noreferrer">View</a> : '—'}</td>
                        <td>
                          <span className={`${styles.badge} ${brand.isActive ? styles.badgeSuccess : styles.badgeDefault}`}>
                            {brand.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.btnEdit}
                              onClick={() => openEditBrandModal(brand)}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.btnDelete}
                              onClick={() => handleDeleteBrand(brand)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {brands.length === 0 && (
                  <div className={styles.emptyState}>
                    <p>No brands found. Create your first brand!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {activeTab === 'categories' && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditingCategory ? 'Edit Category' : 'Create New Category'}
          onSubmit={handleCategorySubmit}
          submitText={isEditingCategory ? 'Update Category' : 'Create Category'}
          submitDisabled={submitLoading}
        >
          <div className={styles.form}>
            <Input
              label="Category Name *"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g., Circuit Breakers"
            />

            <Input
              label="Slug *"
              value={categoryForm.slug}
              onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              error={formErrors.slug}
              placeholder="e.g., circuit-breakers"
            />

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description of this category..."
                rows={3}
              />
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={categoryForm.isActive}
                onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
              />
              <span>Active (visible on website)</span>
            </label>
          </div>
        </Modal>
      )}

      {/* Brand Modal */}
      {activeTab === 'brands' && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditingBrand ? 'Edit Brand' : 'Create New Brand'}
          onSubmit={handleBrandSubmit}
          submitText={isEditingBrand ? 'Update Brand' : 'Create Brand'}
          submitDisabled={submitLoading}
        >
          <div className={styles.form}>
            <Input
              label="Brand Name *"
              value={brandForm.name}
              onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g., Siemens"
            />

            <Input
              label="Logo URL"
              value={brandForm.logo}
              onChange={(e) => setBrandForm({ ...brandForm, logo: e.target.value })}
              placeholder="https://example.com/logo.png"
            />

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={brandForm.description}
                onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                placeholder="Brief description of this brand..."
                rows={3}
              />
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={brandForm.isActive}
                onChange={(e) => setBrandForm({ ...brandForm, isActive: e.target.checked })}
              />
              <span>Active (visible on website)</span>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminCategories;
