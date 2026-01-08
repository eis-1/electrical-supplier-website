import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminDashboard.module.css';
import { Button } from '../../components/ui/Button';
import SEO from '../../components/common/SEO';
import { productService } from '../../services/product.service';
import { quoteService } from '../../services/quote.service';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, quotes: 0, pendingQuotes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const [productsData, quotesData] = await Promise.all([
        productService.getAll({ limit: 1 }),
        quoteService.getAll({ limit: 1 }),
      ]);

      setStats({
        products: productsData.pagination.total,
        quotes: quotesData.pagination.total,
        pendingQuotes: quotesData.items.filter((q: any) => q.status === 'new').length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className={styles.dashboardPage}>
      <SEO title="Admin Dashboard" />
      
      <div className={styles.dashboardHeader}>
        <div className="container">
          <div className={styles.headerContent}>
            <h1>Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Total Products</h3>
            <div className={styles.statNumber}>{stats.products}</div>
          </div>

          <div className={styles.statCard}>
            <h3>Total Quotes</h3>
            <div className={styles.statNumber}>{stats.quotes}</div>
          </div>

          <div className={styles.statCard}>
            <h3>Pending Quotes</h3>
            <div className={styles.statNumber}>{stats.pendingQuotes}</div>
          </div>
        </div>

        <div className={styles.actionsGrid}>
          <div className={styles.actionCard}>
            <h2>Product Management</h2>
            <p>Add, edit, or remove products from your catalog</p>
            <Button onClick={() => navigate('/admin/products')}>
              Manage Products
            </Button>
          </div>

          <div className={styles.actionCard}>
            <h2>Quote Requests</h2>
            <p>View and manage customer quote requests</p>
            <Button onClick={() => navigate('/admin/quotes')}>
              View Quotes
            </Button>
          </div>

          <div className={styles.actionCard}>
            <h2>Categories & Brands</h2>
            <p>Manage product categories and brands</p>
            <Button onClick={() => navigate('/admin/categories')}>
              Manage Categories
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
