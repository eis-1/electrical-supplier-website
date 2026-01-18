import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { quoteService } from '../../services/quote.service';
import apiClient from '../../services/api';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { AdminNavbar } from '../../components/admin/AdminNavbar';
import SEO from '../../components/common/SEO';
import styles from './AdminQuotes.module.css';

interface Quote {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  company?: string;
  productName?: string;
  quantity?: string;
  projectDetails?: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const AdminQuotes: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated } = useAdminAuth();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filter & search states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    status: 'new' as Quote['status'],
    notes: ''
  });

  // Toast notification system
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await quoteService.getAll();
      const items = data.items || [];
      setQuotes(items);
    } catch (_err) {
      const errorMsg = _err instanceof Error ? _err.message : 'Failed to fetch quotes';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Only fetch quotes after authentication is verified
    if (!authLoading && isAuthenticated) {
      fetchQuotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // Filter and search quotes with useMemo for performance
  const filteredQuotes = useMemo(() => {
    let result = quotes;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(q => q.status === statusFilter);
    }

    // Search by multiple fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q =>
        q.id.toLowerCase().includes(query) ||
        q.name.toLowerCase().includes(query) ||
        q.email.toLowerCase().includes(query) ||
        q.company?.toLowerCase().includes(query) ||
        q.phone?.includes(query) ||
        q.productName?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [quotes, statusFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: quotes.length,
    new: quotes.filter(q => q.status === 'new').length,
    contacted: quotes.filter(q => q.status === 'contacted').length,
    quoted: quotes.filter(q => q.status === 'quoted').length,
    closed: quotes.filter(q => q.status === 'closed').length
  }), [quotes]);

  // Open details modal
  const handleViewDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setFormData({
      status: quote.status,
      notes: quote.notes || ''
    });
    setIsDetailsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedQuote(null);
    setFormData({ status: 'new', notes: '' });
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Quick status update (inline from table)
  const handleQuickStatusUpdate = async (quoteId: string, newStatus: Quote['status']) => {
    try {
      await quoteService.update(quoteId, { status: newStatus });
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  // Handle form submission (full update with notes)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedQuote) return;

    setIsUpdating(true);
    try {
      await quoteService.update(selectedQuote.id, {
        status: formData.status,
        notes: formData.notes
      });

      showToast('Quote updated successfully!', 'success');
      handleCloseModal();
      fetchQuotes();
    } catch (_err) {
      showToast(_err instanceof Error ? _err.message : 'Failed to update quote', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete with confirmation
  const handleDelete = async (id: string, quoteName: string) => {
    if (!window.confirm(`Delete quote from ${quoteName}? This cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/quotes/${id}`);
      setQuotes(prev => prev.filter(q => q.id !== id));
      showToast('Quote deleted successfully', 'success');
    } catch {
      showToast('Failed to delete quote', 'error');
    }
  };

  // Handle reply via email
  const handleReply = (quote: Quote) => {
    const subject = encodeURIComponent(`Re: Quote Request from ${quote.name}`);
    const body = encodeURIComponent(`Dear ${quote.name},\n\nThank you for your quote request.\n\nProduct: ${quote.productName || 'N/A'}\nQuantity: ${quote.quantity || 'N/A'}\n\n`);
    window.location.href = `mailto:${quote.email}?subject=${subject}&body=${body}`;
  };

  // Get status badge class
  const getStatusBadgeClass = (status: Quote['status']) => {
    switch (status) {
      case 'new': return styles.badgeNew;
      case 'contacted': return styles.badgePending;
      case 'quoted': return styles.badgeProcessing;
      case 'closed': return styles.badgeCompleted;
      default: return '';
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  if (authLoading || loading) {
    return (
      <div className={styles.pageWrapper}>
        <SEO title="Quote Management - Admin" noIndex />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>
            {authLoading ? 'Verifying authentication...' : 'Loading quotes...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <SEO title="Quote Management - Admin" noIndex />

      {/* Toast Notifications */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
            <span className={styles.toastIcon}>
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className={styles.toastMessage}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <AdminNavbar onLogout={handleLogout} />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className="container">
          <h1 className={styles.pageTitle}>Quote Management</h1>
          <p className={styles.pageSubtitle}>Manage customer quote requests</p>
        </div>
      </div>

      <div className="container">
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statTotal}`}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Total Quotes</div>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statPending}`}>
            <div className={styles.statIcon}>⏳</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.contacted}</div>
              <div className={styles.statLabel}>Contacted</div>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statProcessing}`}>
            <div className={styles.statIcon}>⚙️</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.quoted}</div>
              <div className={styles.statLabel}>Quoted</div>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statCompleted}`}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.closed}</div>
              <div className={styles.statLabel}>Closed</div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="🔍 Search by reference, name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="statusFilter" className={styles.filterLabel}>Status:</label>
            <select
              id="statusFilter"
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All ({stats.total})</option>
              <option value="new">New ({stats.new})</option>
              <option value="contacted">Contacted ({stats.contacted})</option>
              <option value="quoted">Quoted ({stats.quoted})</option>
              <option value="closed">Closed ({stats.closed})</option>
            </select>
          </div>

          <Button onClick={fetchQuotes} variant="outline" disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </Button>
        </div>

        {/* Results Info */}
        <div className={styles.resultsInfo}>
          Showing <strong>{filteredQuotes.length}</strong> of <strong>{quotes.length}</strong> quotes
          {searchQuery && <span> (filtered by "{searchQuery}")</span>}
        </div>

        {/* Quotes Grid/Table */}
        {error && (
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {filteredQuotes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h3 className={styles.emptyTitle}>No quotes found</h3>
            <p className={styles.emptyText}>
              {searchQuery
                ? `No quotes match "${searchQuery}"`
                : statusFilter !== 'all'
                ? `No ${statusFilter} quotes`
                : 'No quote requests yet'}
            </p>
          </div>
        ) : (
          <div className={styles.quotesGrid}>
            {filteredQuotes.map((quote) => (
              <div key={quote.id} className={styles.quoteCard}>
                <div className={styles.quoteHeader}>
                  <div className={styles.quoteRef}>
                    <span className={styles.refLabel}>ID:</span>
                    <span className={styles.refNumber}>{quote.id.substring(0, 8)}</span>
                  </div>
                  <div className={styles.statusBadgeContainer}>
                    <select
                      className={`${styles.statusSelect} ${getStatusBadgeClass(quote.status)}`}
                      value={quote.status}
                      onChange={(e) => handleQuickStatusUpdate(quote.id, e.target.value as Quote['status'])}
                      title="Quick status update"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="quoted">Quoted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className={styles.quoteBody}>
                  <div className={styles.customerInfo}>
                    <h3 className={styles.customerName}>{quote.name}</h3>
                    {quote.company && <p className={styles.companyName}>{quote.company}</p>}
                  </div>

                  <div className={styles.contactInfo}>
                    <div className={styles.contactItem}>
                      <span className={styles.contactIcon}>📧</span>
                      <a href={`mailto:${quote.email}`} className={styles.contactLink}>{quote.email}</a>
                    </div>
                    {quote.phone && (
                      <div className={styles.contactItem}>
                        <span className={styles.contactIcon}>📱</span>
                        <a href={`tel:${quote.phone}`} className={styles.contactLink}>{quote.phone}</a>
                      </div>
                    )}
                  </div>

                  <div className={styles.quoteMessage}>
                    <p className={styles.messagePreview}>
                      <strong>Product:</strong> {quote.productName || 'Not specified'}<br/>
                      <strong>Quantity:</strong> {quote.quantity || 'Not specified'}
                      {quote.projectDetails && (
                        <><br/><strong>Details:</strong> {quote.projectDetails.length > 80 ? `${quote.projectDetails.substring(0, 80)}...` : quote.projectDetails}</>
                      )}
                    </p>
                  </div>

                  <div className={styles.quoteFooter}>
                    <div className={styles.quoteDate}>
                      <span className={styles.dateIcon}>🕐</span>
                      <span className={styles.dateText}>
                        {new Date(quote.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.quoteActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleViewDetails(quote)}
                  >
                    📋 View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReply(quote)}
                  >
                    ✉️ Reply
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(quote.id, quote.name)}
                    style={{ color: '#dc3545' }}
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedQuote && (
        <Modal
          isOpen={isDetailsModalOpen}
          title={`Quote Details - ${selectedQuote.name}`}
          onClose={handleCloseModal}
          size="lg"
        >
          <form onSubmit={handleSubmit} className={styles.detailsForm}>
            {/* Customer Section */}
            <div className={styles.modalSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>👤</span>
                Customer Information
              </h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Full Name:</span>
                  <span className={styles.infoValue}>{selectedQuote.name}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email:</span>
                  <span className={styles.infoValue}>
                    <a href={`mailto:${selectedQuote.email}`}>{selectedQuote.email}</a>
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Phone:</span>
                  <span className={styles.infoValue}>
                    {selectedQuote.phone ? (
                      <a href={`tel:${selectedQuote.phone}`}>{selectedQuote.phone}</a>
                    ) : 'N/A'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Company:</span>
                  <span className={styles.infoValue}>{selectedQuote.company || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Message Section */}
            <div className={styles.modalSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>💬</span>
                Quote Request Details
              </h3>
              <div className={styles.messageBox}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Product:</span>
                  <span className={styles.infoValue}>{selectedQuote.productName || 'Not specified'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Quantity:</span>
                  <span className={styles.infoValue}>{selectedQuote.quantity || 'Not specified'}</span>
                </div>
                {selectedQuote.projectDetails && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Project Details:</span>
                    <p className={styles.fullMessage}>{selectedQuote.projectDetails}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Section */}
            <div className={styles.modalSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📅</span>
                Timeline
              </h3>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>Submitted:</span>
                  <span className={styles.timelineValue}>
                    {new Date(selectedQuote.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>Last Updated:</span>
                  <span className={styles.timelineValue}>
                    {new Date(selectedQuote.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Actions Section */}
            <div className={styles.modalSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚙️</span>
                Admin Actions
              </h3>

              <div className={styles.formGroup}>
                <label htmlFor="modal-status" className={styles.formLabel}>
                  Quote Status <span className={styles.required}>*</span>
                </label>
                <select
                  id="modal-status"
                  name="status"
                  className={`${styles.formSelect} ${getStatusBadgeClass(formData.status)}`}
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="new">🆕 New</option>
                  <option value="contacted">📞 Contacted</option>
                  <option value="quoted">🧾 Quoted</option>
                  <option value="closed">✅ Closed</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="modal-notes" className={styles.formLabel}>
                  Internal Notes
                </label>
                <textarea
                  id="modal-notes"
                  name="notes"
                  className={styles.formTextarea}
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Add internal notes about this quote... (only visible to admins)"
                />
                <span className={styles.helperText}>
                  These notes are for internal use only and won't be visible to customers
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={styles.modalActions}>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : '💾 Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminQuotes;
