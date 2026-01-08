import React, { useState, useEffect } from 'react';
import { quoteService } from '../../services/quote.service';
import apiClient from '../../services/api';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Modal } from '../../components/ui/Modal';
import styles from './AdminProducts.module.css';

interface Quote {
  id: number;
  referenceNumber: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const AdminQuotes: React.FC = () => {
  useAdminAuth();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Form state for updates
  const [formData, setFormData] = useState({
    status: 'pending' as Quote['status'],
    adminNotes: ''
  });

  const [formErrors, setFormErrors] = useState({
    status: '',
    adminNotes: ''
  });

  // Fetch quotes
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await quoteService.getAll();
      // Service returns { items: [], pagination: {} }
      const items = data.items || [];
      setQuotes(items);
      setFilteredQuotes(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quotes');
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  // Filter quotes by status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredQuotes(quotes);
    } else {
      setFilteredQuotes(quotes.filter(q => q.status === statusFilter));
    }
  }, [statusFilter, quotes]);

  // Open details modal
  const handleViewDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setFormData({
      status: quote.status,
      adminNotes: quote.adminNotes || ''
    });
    setFormErrors({ status: '', adminNotes: '' });
    setIsDetailsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedQuote(null);
    setFormData({ status: 'pending', adminNotes: '' });
    setFormErrors({ status: '', adminNotes: '' });
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors = {
      status: '',
      adminNotes: ''
    };

    if (!formData.status) {
      errors.status = 'Status is required';
    }

    setFormErrors(errors);
    return !errors.status && !errors.adminNotes;
  };

  // Handle form submission (update quote)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedQuote) {
      return;
    }

    try {
      await quoteService.update(String(selectedQuote.id), {
        status: formData.status,
        notes: formData.adminNotes
      });

      alert('Quote updated successfully!');
      handleCloseModal();
      fetchQuotes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update quote');
      console.error('Error updating quote:', err);
    }
  };

  // Handle delete
  const handleDelete = async (id: number, referenceNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete quote ${referenceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/quotes/${id}`);
      alert('Quote deleted successfully!');
      fetchQuotes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete quote');
      console.error('Error deleting quote:', err);
    }
  };

  // Handle reply via email
  const handleReply = (quote: Quote) => {
    const subject = encodeURIComponent(`Re: Quote Request ${quote.referenceNumber}`);
    const body = encodeURIComponent(`Dear ${quote.name},\n\nThank you for your quote request (${quote.referenceNumber}).\n\n`);
    window.location.href = `mailto:${quote.email}?subject=${subject}&body=${body}`;
  };

  // Get status badge color
  const getStatusBadgeClass = (status: Quote['status']) => {
    switch (status) {
      case 'pending':
        return styles.badgePending;
      case 'processing':
        return styles.badgeProcessing;
      case 'completed':
        return styles.badgeCompleted;
      case 'rejected':
        return styles.badgeRejected;
      default:
        return '';
    }
  };

  // Calculate stats
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    processing: quotes.filter(q => q.status === 'processing').length,
    completed: quotes.filter(q => q.status === 'completed').length
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Quote Management</h1>
        </div>
        <p>Loading quotes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Quote Management</h1>
        </div>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quote Management</h1>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total Quotes</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.pending}</div>
          <div className={styles.statLabel}>Pending</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.processing}</div>
          <div className={styles.statLabel}>Processing</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.completed}</div>
          <div className={styles.statLabel}>Completed</div>
        </div>
      </div>

      {/* Filter */}
      <div className={styles.actions}>
        <div className={styles.filters}>
          <select 
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Quotes Table */}
      {filteredQuotes.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No quotes found</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <strong>{quote.referenceNumber}</strong>
                  </td>
                  <td>{quote.name}</td>
                  <td>{quote.email}</td>
                  <td>{quote.phone || '-'}</td>
                  <td>{quote.company || '-'}</td>
                  <td>
                    <span className={`${styles.badge} ${getStatusBadgeClass(quote.status)}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td>{new Date(quote.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.btnView}
                        onClick={() => handleViewDetails(quote)}
                        title="View Details"
                      >
                        View
                      </button>
                      <button
                        className={styles.btnReply}
                        onClick={() => handleReply(quote)}
                        title="Reply via Email"
                      >
                        Reply
                      </button>
                      <button
                        className={styles.btnDelete}
                        onClick={() => handleDelete(quote.id, quote.referenceNumber)}
                        title="Delete Quote"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details/Update Modal */}
      {isDetailsModalOpen && selectedQuote && (
        <Modal
          isOpen={isDetailsModalOpen}
          title={`Quote Details - ${selectedQuote.referenceNumber}`}
          onClose={handleCloseModal}
          size="lg"
        >
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Customer Details */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Customer Information</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <strong>Name:</strong> {selectedQuote.name}
                </div>
                <div className={styles.infoItem}>
                  <strong>Email:</strong> {selectedQuote.email}
                </div>
                <div className={styles.infoItem}>
                  <strong>Phone:</strong> {selectedQuote.phone || 'N/A'}
                </div>
                <div className={styles.infoItem}>
                  <strong>Company:</strong> {selectedQuote.company || 'N/A'}
                </div>
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                  <strong>Message:</strong>
                  <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{selectedQuote.message}</p>
                </div>
                <div className={styles.infoItem}>
                  <strong>Submitted:</strong> {new Date(selectedQuote.createdAt).toLocaleString()}
                </div>
                <div className={styles.infoItem}>
                  <strong>Last Updated:</strong> {new Date(selectedQuote.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Update Status & Notes</h3>
              
              <div className={styles.formGroup}>
                <label htmlFor="status">
                  Status <span className={styles.required}>*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  className={styles.select}
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                {formErrors.status && (
                  <span className={styles.errorText}>{formErrors.status}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="adminNotes">Admin Notes</label>
                <textarea
                  id="adminNotes"
                  name="adminNotes"
                  className={styles.textarea}
                  value={formData.adminNotes}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Add internal notes about this quote..."
                />
                {formErrors.adminNotes && (
                  <span className={styles.errorText}>{formErrors.adminNotes}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={handleCloseModal}>
                Cancel
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Update Quote
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminQuotes;
