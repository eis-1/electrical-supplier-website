import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminProducts.module.css';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/FileUpload';
import SEO from '../../components/common/SEO';
import { productService } from '../../services/product.service';
import { categoryService } from '../../services/category.service';
import { brandService } from '../../services/brand.service';
import { uploadService } from '../../services/upload.service';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import type { Product, Category, Brand } from '../../types';

interface ProductFormData {
  name: string;
  model: string;
  description: string;
  categoryId: string;
  brandId: string;
  datasheetUrl: string;
  datasheetFile: File | null;
  isFeatured: boolean;
}

const AdminProducts = () => {
  const navigate = useNavigate();
  const { isLoading: authLoading, logout } = useAdminAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    model: '',
    description: '',
    categoryId: '',
    brandId: '',
    datasheetUrl: '',
    datasheetFile: null,
    isFeatured: false,
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
      const [productsData, categoriesData, brandsData] = await Promise.all([
        productService.getAll({ limit: 100 }),
        categoryService.getAll(true),
        brandService.getAll(true),
      ]);
      setProducts(productsData.items);
      setCategories(categoriesData);
      setBrands(brandsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      model: '',
      description: '',
      categoryId: '',
      brandId: '',
      datasheetUrl: '',
      datasheetFile: null,
      isFeatured: false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      model: product.model || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      brandId: product.brandId || '',
      datasheetUrl: product.datasheetUrl || '',
      datasheetFile: null,
      isFeatured: product.isFeatured || false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.categoryId) errors.categoryId = 'Category is required';
    if (!formData.brandId) errors.brandId = 'Brand is required';
    if (!formData.description.trim()) errors.description = 'Description is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitLoading(true);
    try {
      // Upload datasheet if new file selected
      let datasheetUrl = formData.datasheetUrl;
      if (formData.datasheetFile) {
        const uploadResult = await uploadService.uploadFile(formData.datasheetFile);
        datasheetUrl = uploadResult.url;
      }

      const productData = {
        name: formData.name,
        model: formData.model,
        categoryId: formData.categoryId,
        brandId: formData.brandId,
        description: formData.description,
        datasheetUrl: datasheetUrl || undefined,
        isFeatured: formData.isFeatured,
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, productData);
        alert('Product updated successfully!');
      } else {
        await productService.create(productData);
        alert('Product created successfully!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await productService.delete(product.id);
      alert('Product deleted successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const toggleFeatured = async (product: Product) => {
    try {
      await productService.update(product.id, { isFeatured: !product.isFeatured });
      fetchData();
    } catch (error) {
      console.error('Error toggling featured:', error);
      alert('Failed to update product');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className={styles.adminPage}>
      <SEO title="Product Management - Admin" />
      
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
              <h1>Product Management</h1>
              <p>Manage your product catalog</p>
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
              <span className={styles.statLabel}>Total Products</span>
              <span className={styles.statValue}>{products.length}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Featured</span>
              <span className={styles.statValue}>
                {products.filter(p => p.isFeatured).length}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Categories</span>
              <span className={styles.statValue}>{categories.length}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Brands</span>
              <span className={styles.statValue}>{brands.length}</span>
            </div>
          </div>

          <div className={styles.toolbar}>
            <Button onClick={openCreateModal}>+ Add New Product</Button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Model</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <span className={styles.productName}>{product.name}</span>
                    </td>
                    <td>{product.model || '—'}</td>
                    <td>
                      {categories.find(c => c.id === product.categoryId)?.name || '—'}
                    </td>
                    <td>
                      {brands.find(b => b.id === product.brandId)?.name || '—'}
                    </td>
                    <td>
                      <button
                        className={`${styles.badge} ${product.isFeatured ? styles.badgeSuccess : styles.badgeDefault}`}
                        onClick={() => toggleFeatured(product)}
                      >
                        {product.isFeatured ? '★ Featured' : 'Not Featured'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.btnEdit}
                          onClick={() => openEditModal(product)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.length === 0 && (
              <div className={styles.emptyState}>
                <p>No products found. Create your first product!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Create New Product'}
        onSubmit={handleSubmit}
        submitText={editingProduct ? 'Update Product' : 'Create Product'}
        submitDisabled={submitLoading}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formRow}>
            <Input
              label="Product Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g., Circuit Breaker MCB 32A"
            />
          </div>

          <div className={styles.formRow}>
            <Input
              label="Model Number"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., MCB-32A-C"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className={formErrors.categoryId ? styles.error : ''}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && <span className={styles.errorText}>{formErrors.categoryId}</span>}
            </div>

            <div className={styles.formGroup}>
              <label>Brand *</label>
              <select
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                className={formErrors.brandId ? styles.error : ''}
              >
                <option value="">Select Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {formErrors.brandId && <span className={styles.errorText}>{formErrors.brandId}</span>}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed product description..."
                rows={4}
                className={formErrors.description ? styles.error : ''}
              />
              {formErrors.description && <span className={styles.errorText}>{formErrors.description}</span>}
            </div>
          </div>

          <div className={styles.formRow}>
            <FileUpload
              label="Product Datasheet (PDF)"
              accept=".pdf"
              maxSizeMB={10}
              onFileSelect={(file) => setFormData({ ...formData, datasheetFile: file })}
              onFileRemove={() => setFormData({ ...formData, datasheetFile: null, datasheetUrl: '' })}
              currentFileUrl={formData.datasheetUrl && !formData.datasheetFile ? uploadService.getFileUrl(formData.datasheetUrl) : undefined}
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              />
              <span>Feature this product on homepage</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProducts;
