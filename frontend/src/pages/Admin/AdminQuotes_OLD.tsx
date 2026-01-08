import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminProducts.module.css';
import { Button } from '../../components/ui/Button';
import SEO from '../../components/common/SEO';
import { quoteService } from '../../services/quote.service';

interface Quote {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  company?: string;
  message: string;
  status: string;
  createdAt: string;
}

const AdminQuotes = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalQuotes, setTotalQuotes] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchQuotes();
  }, [navigate]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const data = await quoteService.getAll({ limit: 100 });
      setQuotes(data.items as any);
      setTotalQuotes(data.pagination.total);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      new: 'badgeNew',
      pending: 'badgeWarning',
      contacted: 'badgeInfo',
      completed: 'badgeSuccess'
    };
    return styles[statusMap[status] || 'badgeDefault'];
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className={styles.adminPage}>
      <SEO title="Quote Requests - Admin" />
      
      <div className={styles.header}>
        <div className="container">
          <div className={styles.headerContent}>
            <div>
              <h1>Quote Requests</h1>
              <p>Manage B2B customer quote requests</p>
            </div>
            <div className={styles.headerActions}>
              <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
                ← Dashboard
              </Button>
              <Button variant="outline" onClick={handleLogout}>
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
              <span className={styles.statLabel}>Total Requests</span>
              <span className={styles.statValue}>{totalQuotes}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>New</span>
              <span className={styles.statValue}>
                {quotes.filter(q => q.status === 'new').length}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Pending</span>
              <span className={styles.statValue}>
                {quotes.filter(q => q.status === 'pending').length}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Completed</span>
              <span className={styles.statValue}>
                {quotes.filter(q => q.status === 'completed').length}
              </span>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyState}>
                      No quote requests found.
                    </td>
                  </tr>
                ) : (
                  quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td className={styles.productName}>
                        <strong>{quote.customerName}</strong>
                      </td>
                      <td>{quote.company || '-'}</td>
                      <td>
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>
                          <div>{quote.email}</div>
                          <div style={{ color: 'var(--color-text-secondary)' }}>
                            {quote.phone}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {quote.message}
                        </div>
                      </td>
                      <td>
                        <span className={getStatusBadge(quote.status)}>
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ fontSize: 'var(--font-size-sm)' }}>
                        {formatDate(quote.createdAt)}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.btnSmall}
                            onClick={() => alert(`View details:\n\n${JSON.stringify(quote, null, 2)}`)}
                            title="View Details"
                          >
                            👁️ View
                          </button>
                          <a
                            href={`mailto:${quote.email}?subject=Re: Quote Request&body=Dear ${quote.customerName},%0D%0A%0D%0A`}
                            className={styles.btnSmall}
                            title="Reply via Email"
                          >
                            ✉️ Reply
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.infoBox}>
            <h3>💡 B2B Quote Management</h3>
            <p>
              This is your centralized hub for managing all B2B customer quote requests. Here's what you can do:
            </p>
            <ul>
              <li><strong>View Details:</strong> Click "View" to see the full quote request</li>
              <li><strong>Reply Directly:</strong> Click "Reply" to respond via email</li>
              <li><strong>Track Status:</strong> Monitor quote progress from New → Pending → Completed</li>
              <li><strong>Contact Info:</strong> All customer details are accessible for follow-up</li>
            </ul>
            <p style={{ marginTop: 'var(--spacing-md)', marginBottom: 0 }}>
              <strong>Pro Tip:</strong> Respond quickly to new quotes to improve customer satisfaction and conversion rates!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuotes;
