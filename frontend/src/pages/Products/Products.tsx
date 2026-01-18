import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import styles from './Products.module.css';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LazyImage } from '../../components/ui/LazyImage';
import SEO from '../../components/common/SEO';
import { productService } from '../../services/product.service';
import { categoryService } from '../../services/category.service';
import { brandService } from '../../services/brand.service';
import type { Product, Category, Brand } from '../../types/index';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });

  const selectedCategory = useMemo(() => searchParams.get('category') || '', [searchParams]);
  const selectedBrands = useMemo(() => searchParams.getAll('brand'), [searchParams]);
  const selectedBrandsKey = useMemo(() => selectedBrands.join(','), [selectedBrands]);
  const searchQuery = useMemo(() => searchParams.get('search') || '', [searchParams]);
  const currentPage = useMemo(() => parseInt(searchParams.get('page') || '1', 10), [searchParams]);

  const seoTitle = useMemo(() => {
    if (searchQuery) return `Search: ${searchQuery}`;
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      return cat ? `${cat.name} Products` : 'Products';
    }
    return 'Products';
  }, [searchQuery, selectedCategory, categories]);

  const seoDescription = useMemo(() => {
    if (searchQuery) return `Search results for "${searchQuery}" - industrial electrical products and components.`;
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      return cat ? `Browse ${cat.name.toLowerCase()} from top brands - quality industrial electrical components.` : 'Browse our complete range of industrial electrical products.';
    }
    return 'Browse our complete range of industrial electrical products, automation components, and solutions from authorized brands.';
  }, [searchQuery, selectedCategory, categories]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          categoryService.getAll(),
          brandService.getAll(),
        ]);
        setCategories(categoriesData);
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await productService.getAll({
          category: selectedCategory,
          brand: selectedBrands,
          search: searchQuery,
          page: currentPage,
          limit: 12,
        });
        setProducts(data.items);
        setPagination(data.pagination);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategory, selectedBrands, selectedBrandsKey, searchQuery, currentPage]);

  const handleCategoryFilter = useCallback((slug: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug === selectedCategory) {
      newParams.delete('category');
    } else {
      newParams.set('category', slug);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  }, [searchParams, selectedCategory, setSearchParams]);

  const handleBrandFilter = useCallback((slug: string) => {
    const newParams = new URLSearchParams(searchParams);
    const currentBrands = newParams.getAll('brand');

    if (currentBrands.includes(slug)) {
      newParams.delete('brand');
      currentBrands.filter(b => b !== slug).forEach(b => newParams.append('brand', b));
    } else {
      newParams.append('brand', slug);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    newParams.delete('page');
    setSearchParams(newParams);
  }, [searchInput, searchParams, setSearchParams]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    newParams.delete('page');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  return (
    <div className={styles.productsPage}>
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords="electrical products, industrial automation, circuit breakers, contactors, MCB, MCCB, cables, switches"
      />
      <div className="container">
        <h1 className={styles.pageTitle}>Products Catalog</h1>

        {/* Search Bar */}
        <div className={styles.searchSection}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <Input
              placeholder="Search products by name, model, or keyword..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit">Search</Button>
            {searchQuery && (
              <Button type="button" variant="outline" onClick={clearSearch}>
                Clear
              </Button>
            )}
          </form>
          {searchQuery && (
            <p className={styles.searchInfo}>
              Showing results for: <strong>"{searchQuery}"</strong>
            </p>
          )}
        </div>

        <div className={styles.productsLayout}>
          {/* Sidebar Filters */}
          <aside className={styles.sidebar}>
            <div className={styles.filterSection}>
              <h3>Categories</h3>
              <div className={styles.filterList}>
                {categories.map((category) => (
                  <label key={category.id} className={styles.filterItem}>
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === category.slug}
                      onChange={() => handleCategoryFilter(category.slug)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <h3>Brands</h3>
              <div className={styles.filterList}>
                {brands.map((brand) => (
                  <label key={brand.id} className={styles.filterItem}>
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.slug)}
                      onChange={() => handleBrandFilter(brand.slug)}
                    />
                    <span>{brand.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main className={styles.productsMain}>
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : products.length === 0 ? (
              <div className={styles.noResults}>
                <p>No products found matching your criteria.</p>
              </div>
            ) : (
              <>
                <div className={styles.productsGrid}>
                  {products.map((product) => {
                    const productName = `${product.name}${product.model ? ` - ${product.model}` : ''}`;
                    const quoteParams = new URLSearchParams({ productName });
                    const quoteLink = `/quote?${quoteParams.toString()}`;

                    return (
                      <Card key={product.id} hoverable>
                        <div className={styles.productCard}>
                          <Link to={`/products/${product.slug}`} className={styles.productLink}>
                            <div className={styles.productImage}>
                              {product.image ? (
                                <LazyImage src={product.image} alt={product.name} />
                              ) : (
                                <div className={styles.imagePlaceholder}>No Image</div>
                              )}
                            </div>
                            <div className={styles.productInfo}>
                              <h3>{product.name}</h3>
                              {product.brand && <p className={styles.brand}>{product.brand.name}</p>}
                              {product.model && <p className={styles.model}>Model: {product.model}</p>}
                            </div>
                          </Link>
                          <div className={styles.productActions}>
                            <Button as="link" to={quoteLink} fullWidth size="sm">Request Quote</Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className={styles.pagination}>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`${styles.pageButton} ${page === currentPage ? styles.active : ''}`}
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('page', page.toString());
                          setSearchParams(newParams);
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Products;
