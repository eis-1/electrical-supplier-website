import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdminDashboard.module.css";
import { Button } from "../../components/ui/Button";
import { AdminNavbar } from "../../components/admin/AdminNavbar";
import SEO from "../../components/common/SEO";
import { productService } from "../../services/product.service";
import { quoteService } from "../../services/quote.service";
import { useAdminAuth } from "../../hooks/useAdminAuth";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface Quote {
  id: string;
  referenceNumber: string;
  companyName: string;
  status: string;
  createdAt: string;
}

interface SystemHealth {
  status: "healthy" | "degraded" | "error";
  database: boolean;
  uptime: number;
  memory: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated, logout } = useAdminAuth();
  const [stats, setStats] = useState({
    products: 0,
    quotes: 0,
    newQuotes: 0,
    contactedQuotes: 0,
    quotedQuotes: 0,
    closedQuotes: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsData, quotesData] = await Promise.all([
        productService.getAll({ limit: 1 }),
        quoteService.getAll({ limit: 1000 }),
      ]);

      const quotes = quotesData.items || [];

      // Set statistics
      setStats({
        products: productsData.pagination.total,
        quotes: quotes.length,
        newQuotes: quotes.filter((q: any) => q.status === "new").length,
        contactedQuotes: quotes.filter((q: any) => q.status === "contacted")
          .length,
        quotedQuotes: quotes.filter((q: any) => q.status === "quoted").length,
        closedQuotes: quotes.filter((q: any) => q.status === "closed").length,
      });

      // Set recent quotes (last 5)
      const recent = quotes
        .sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5)
        .map((q: any) => ({
          id: q.id,
          referenceNumber: q.referenceNumber,
          companyName: q.companyName,
          status: q.status,
          createdAt: q.createdAt,
        }));
      setRecentQuotes(recent);

      // Fetch system health
      try {
        const healthResponse = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/health`
        );
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setSystemHealth({
            status: "healthy",
            database: healthData.database !== false,
            uptime: healthData.uptime || 0,
            memory: healthData.memory?.heapUsed || "N/A",
          });
        }
      } catch {
        setSystemHealth({
          status: "degraded",
          database: true,
          uptime: 0,
          memory: "N/A",
        });
      }

      showToast("Dashboard data loaded", "success");
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    fetchDashboardData();
  }, [authLoading, isAuthenticated, fetchDashboardData]);

  const handleLogout = () => {
    showToast("Logged out successfully", "info");
    logout();
  };

  const quickActions = [
    {
      title: "Product Management",
      description: "Add, edit, or remove products from your catalog",
      icon: "📦",
      path: "/admin/products",
      variant: "Products",
      stats: `${stats.products} Products`,
    },
    {
      title: "Quote Requests",
      description: "View and manage customer quote requests",
      icon: "💼",
      path: "/admin/quotes",
      variant: "Quotes",
      stats: `${stats.quotes} Total Quotes`,
    },
    {
      title: "Categories & Brands",
      description: "Manage product categories and brands",
      icon: "🏷️",
      path: "/admin/categories",
      variant: "Categories",
      stats: "Organization",
    },
  ];

  if (authLoading || loading) {
    return (
      <div className={styles.pageWrapper}>
        <SEO title="Admin Dashboard" noIndex />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>
            {authLoading
              ? "Verifying authentication..."
              : "Loading dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <SEO title="Admin Dashboard" noIndex />

      {/* Toast Notifications */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}
          >
            <span className={styles.toastIcon}>
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "✕"}
              {toast.type === "info" && "ℹ"}
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
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>
            Welcome back! Here's what's happening
          </p>
        </div>
      </div>

      <div className="container">
        {/* Welcome Message */}
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeContent}>
            <h2 className={styles.welcomeTitle}>Dashboard Overview</h2>
            <p className={styles.welcomeText}>
              Manage your electrical supplier business from one central hub.
              Quick access to all your admin tools.
            </p>
          </div>
          <div className={styles.welcomeIcon}>🎯</div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statProducts}`}>
            <div className={styles.statIcon}>📦</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.products}</div>
              <div className={styles.statLabel}>Total Products</div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statQuotes}`}>
            <div className={styles.statIcon}>💼</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.quotes}</div>
              <div className={styles.statLabel}>All Quotes</div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statPending}`}>
            <div className={styles.statIcon}>⏳</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.newQuotes}</div>
              <div className={styles.statLabel}>New</div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statProcessing}`}>
            <div className={styles.statIcon}>⚙️</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.contactedQuotes}</div>
              <div className={styles.statLabel}>Contacted</div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCompleted}`}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.quotedQuotes}</div>
              <div className={styles.statLabel}>Quoted</div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCompleted}`}>
            <div className={styles.statIcon}>📌</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.closedQuotes}</div>
              <div className={styles.statLabel}>Closed</div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statRefresh}`}>
            <Button
              variant="outline"
              onClick={fetchDashboardData}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "🔄 Refresh Stats"}
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <p className={styles.sectionSubtitle}>
            Jump to your most-used admin tools
          </p>
        </div>

        <div className={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <div
              key={index}
              className={`${styles.actionCard} ${styles[`actionCard${action.variant}`]}`}
              onClick={() => navigate(action.path)}
            >
              <div className={styles.actionHeader}>
                <div className={styles.actionIcon}>{action.icon}</div>
                <div className={styles.actionBadge}>{action.stats}</div>
              </div>
              <h3 className={styles.actionTitle}>{action.title}</h3>
              <p className={styles.actionDescription}>{action.description}</p>
              <div className={styles.actionFooter}>
                <span className={styles.actionLink}>Open →</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Quotes</h2>
          <p className={styles.sectionSubtitle}>Latest customer requests</p>
        </div>

        {recentQuotes.length > 0 ? (
          <div className={styles.recentQuotesContainer}>
            {recentQuotes.map((quote) => (
              <div
                key={quote.id}
                className={styles.quoteCard}
                onClick={() => navigate("/admin/quotes")}
              >
                <div className={styles.quoteHeader}>
                  <span className={styles.quoteReference}>
                    #{quote.referenceNumber}
                  </span>
                  <span className={`${styles.quoteStatus} ${styles[`quoteStatus${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}`]}`}>
                    {quote.status}
                  </span>
                </div>
                <div className={styles.quoteBody}>
                  <h4 className={styles.quoteCompany}>{quote.companyName}</h4>
                  <p className={styles.quoteDate}>
                    {new Date(quote.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <p className={styles.emptyText}>No recent quotes</p>
          </div>
        )}

        {/* System Status Section */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>System Status</h2>
          <p className={styles.sectionSubtitle}>
            {systemHealth?.status === "healthy"
              ? "Everything running smoothly"
              : "Monitoring system health"}
          </p>
        </div>

        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <div className={`${styles.statusIcon} ${systemHealth?.database ? styles.statusHealthy : styles.statusError}`}>
              {systemHealth?.database ? "✅" : "⚠️"}
            </div>
            <div className={styles.statusContent}>
              <div className={styles.statusLabel}>Database</div>
              <div className={styles.statusValue}>
                {systemHealth?.database ? "Connected" : "Disconnected"}
              </div>
            </div>
          </div>

          <div className={styles.statusCard}>
            <div className={`${styles.statusIcon} ${systemHealth?.status === "healthy" ? styles.statusHealthy : styles.statusWarning}`}>
              {systemHealth?.status === "healthy" ? "✅" : "⚠️"}
            </div>
            <div className={styles.statusContent}>
              <div className={styles.statusLabel}>API Server</div>
              <div className={styles.statusValue}>
                {systemHealth?.status === "healthy" ? "Online" : "Degraded"}
              </div>
            </div>
          </div>

          <div className={styles.statusCard}>
            <div className={`${styles.statusIcon} ${styles.statusHealthy}`}>
              ⏱️
            </div>
            <div className={styles.statusContent}>
              <div className={styles.statusLabel}>Uptime</div>
              <div className={styles.statusValue}>
                {systemHealth?.uptime
                  ? `${Math.floor(systemHealth.uptime / 3600)}h ${Math.floor((systemHealth.uptime % 3600) / 60)}m`
                  : "N/A"}
              </div>
            </div>
          </div>

          <div className={styles.statusCard}>
            <div className={`${styles.statusIcon} ${styles.statusHealthy}`}>
              💾
            </div>
            <div className={styles.statusContent}>
              <div className={styles.statusLabel}>Memory</div>
              <div className={styles.statusValue}>
                {typeof systemHealth?.memory === "string" && systemHealth.memory !== "N/A"
                  ? systemHealth.memory
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Tips Section */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick Stats</h2>
          <p className={styles.sectionSubtitle}>At a glance</p>
        </div>

        <div className={styles.tipsGrid}>
          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>📊</div>
            <div className={styles.tipContent}>
              <h4 className={styles.tipTitle}>Quote Conversion</h4>
              <p className={styles.tipValue}>
                {stats.quotes > 0
                  ? `${Math.round((stats.quotedQuotes / stats.quotes) * 100)}%`
                  : "0%"}
              </p>
              <p className={styles.tipDescription}>
                Quotes provided to customers
              </p>
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>✅</div>
            <div className={styles.tipContent}>
              <h4 className={styles.tipTitle}>Completion Rate</h4>
              <p className={styles.tipValue}>
                {stats.quotes > 0
                  ? `${Math.round((stats.closedQuotes / stats.quotes) * 100)}%`
                  : "0%"}
              </p>
              <p className={styles.tipDescription}>
                Successfully closed deals
              </p>
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>⏳</div>
            <div className={styles.tipContent}>
              <h4 className={styles.tipTitle}>Pending Action</h4>
              <p className={styles.tipValue}>{stats.newQuotes}</p>
              <p className={styles.tipDescription}>
                New quotes awaiting response
              </p>
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>📦</div>
            <div className={styles.tipContent}>
              <h4 className={styles.tipTitle}>Product Catalog</h4>
              <p className={styles.tipValue}>{stats.products}</p>
              <p className={styles.tipDescription}>
                Total active products
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
