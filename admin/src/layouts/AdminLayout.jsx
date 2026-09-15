import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, Building2,
  ClipboardList, Users, Star, TicketPercent,
  RotateCcw, Settings, ChevronLeft, ChevronRight, ChevronDown,
  Moon, Sun, Search, Bell, Menu, LogOut, User, Trash2,
  PackagePlus, AlertCircle, Barcode, Check, ShieldCheck
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import { Toaster } from 'react-hot-toast';
import logo from '../assets/logo.png';
import './AdminLayout.css';
import { canAccessMenuItem } from '../utils/accessControl';

import { Mail } from 'lucide-react';
const AdminLayout = ({ children, theme, currentUser, onLogout }) => {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ products: true });
  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Removed toggleLanguage as it's now handled by the component

  const languages = [
    { code: 'ar', name: 'العربية', flag: '🇩🇿' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code);
    setProfileOpen(false);
  };

  // Updated menuItems with nested structure
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: t('menu.dashboard'), permission: 'dashboard.read' },
    {
      id: 'products',
      path: '/products',
      icon: Package,
      label: t('menu.products'),
      anyPermissions: ['products.read', 'products.create', 'products.update', 'products.bulk_receive', 'products.barcode.manage'],
      children: [
        { path: '/products', icon: Package, label: t('menu.allProducts'), permission: 'products.read' },
        { path: '/products/quick-receive', icon: PackagePlus, label: t('menu.quickReceive'), permission: 'products.bulk_receive' },
        { path: '/products/incomplete', icon: AlertCircle, label: t('menu.incompleteProducts'), permission: 'products.read' },
        { path: '/barcode-scanner', icon: Barcode, label: t('menu.barcodeScanner'), permission: 'products.barcode.manage' }
      ]
    },
    { path: '/categories', icon: FolderTree, label: t('menu.categories'), permission: 'categories.read' },
    { path: '/collections', icon: FolderTree, label: t('menu.collections'), permission: 'collections.read' },
    { path: '/orders', icon: ClipboardList, label: t('menu.orders'), permission: 'orders.read' },
    { path: '/users', icon: Users, label: t('menu.customers'), permission: 'customers.read' },
    { path: '/suppliers', icon: Building2, label: t('menu.suppliers'), permission: 'suppliers.read' },
    { path: '/inventory', icon: Package, label: t('menu.inventory'), permission: 'inventory.read' },
    { path: '/reviews', icon: Star, label: t('menu.reviews'), permission: 'reviews.read' },
    { path: '/promotions', icon: TicketPercent, label: t('menu.promotions'), permission: 'promotions.read' },
    { path: '/returns', icon: RotateCcw, label: t('menu.returns'), permission: 'returns.read' },
    { path: '/trash', icon: Trash2, label: t('menu.trash'), superAdminOnly: true },
    {
      id: 'newsletter',
      path: '/newsletter',
      icon: Mail,
      label: t('menu.newsletter'),
      anyPermissions: ['newsletter.subscribers.read', 'newsletter.broadcasts.read'],
      children: [
        { path: '/newsletter/subscribers', icon: Users, label: t('menu.newsletterSubscribers'), permission: 'newsletter.subscribers.read' },
        { path: '/newsletter/broadcasts', icon: Mail, label: t('menu.newsletterBroadcasts'), permission: 'newsletter.broadcasts.read' }
      ]
    },
    { path: '/settings', icon: Settings, label: t('menu.settings'), permission: 'settings.read' },
    { path: '/team-access', icon: ShieldCheck, label: t('menu.teamAccess'), superAdminOnly: true },
  ];

  const visibleMenuItems = menuItems.reduce((visible, item) => {
    if (item.children) {
      const children = item.children.filter((child) => canAccessMenuItem(currentUser, child));
      if (children.length > 0 && canAccessMenuItem(currentUser, item)) visible.push({ ...item, children });
    } else if (canAccessMenuItem(currentUser, item)) {
      visible.push(item);
    }
    return visible;
  }, []);

  
  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const isMenuActive = (item) => {
    if (item.path === '/') return location.pathname === '/';
    if (item.children) {
      return location.pathname === item.path || item.children.some(child => location.pathname.startsWith(child.path));
    }
    return location.pathname.startsWith(item.path);
  };

  // Logic to handle icon direction based on language + collapse state
  const isRTL = i18n.language === 'ar';
  const CollapseIcon = collapsed
    ? (isRTL ? ChevronLeft : ChevronRight)
    : (isRTL ? ChevronRight : ChevronLeft);

  return (
    <>
      <Toaster position="top-right" />
      <div className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${theme}`}>

        {mobileOpen && (
          <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
        )}

        {/* SIDEBAR */}
        <aside className={`app-sidebar ${mobileOpen ? 'is-mobile-open' : ''}`}>
          <div className="sidebar-header">
            <div className="brand-logo">
              <img src={logo} alt="MaxiStore" className="logo-icon-img" />
              <span className="logo-text">MaxiStore</span>
            </div>
          </div>

          <div className="sidebar-content">
            <nav className="nav-menu">
              {visibleMenuItems.map((item) => {
                const isActive = isMenuActive(item);
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = hasChildren && expandedMenus[item.id];

                return (
                  <div key={item.path} className="nav-item-wrapper">
                    {hasChildren ? (
                      <>
                        <div
                          className={`nav-item ${isActive ? 'active' : ''} has-children`}
                          onClick={() => toggleMenu(item.id)}
                          title={collapsed ? item.label : ''}
                        >
                          <item.icon size={20} className="nav-icon" />
                          <span className="nav-label">{item.label}</span>
                          <ChevronDown
                            size={16}
                            className={`nav-chevron ${isExpanded ? 'expanded' : ''}`}
                          />
                        </div>
                        {isExpanded && !collapsed && (
                          <div className="nav-submenu">
                            {item.children.map((child) => {
                              const childActive = location.pathname.startsWith(child.path);
                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  className={`nav-subitem ${childActive ? 'active' : ''}`}
                                  onClick={() => setMobileOpen(false)}
                                >
                                  <child.icon size={18} className="nav-icon" />
                                  <span className="nav-label">{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        to={item.path}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        title={collapsed ? item.label : ''}
                        onClick={() => setMobileOpen(false)}
                      >
                        <item.icon size={20} className="nav-icon" />
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-footer">
            {/* 2. FIX: Added translation and dynamic icon logic here */}
            <button className="nav-item collapse-btn" onClick={() => setCollapsed(!collapsed)}>
              <CollapseIcon size={20} />
              <span className="nav-label">{t('menu.collapse')}</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="app-main">
          <header className="app-header">
            <div className="header-left">
              <button className="icon-btn mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                <Menu size={24} />
              </button>
              <div className="header-search">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder={t('header.search')}
                  />
                  <div className="search-shortcut">
                    <kbd>Ctrl K</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="header-actions">
              <div className="header-action-group">
                <NotificationBell isAuthenticated={!!currentUser} />
              </div>

              <div className="user-menu-container" ref={dropdownRef}>
                <div
                  className="user-profile"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <div className="avatar">
                    {currentUser?.firstName?.[0] || 'A'}
                  </div>
                  <div className="user-text">
                    <span className="name">{currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Admin' : 'Admin'}</span>
                    <span className="role">{currentUser?.accessRole?.name || (currentUser?.role === 'sub_admin' ? 'Sub-admin' : t('header.manager'))}</span>
                  </div>
                  <ChevronDown size={14} className={`profile-chevron ${profileOpen ? 'rotate' : ''}`} />
                </div>

                {profileOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <span className="dropdown-name">{currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Admin' : 'Admin'}</span>
                      <span className="dropdown-email">{currentUser?.email || 'admin@maxistore.com'}</span>
                    </div>
                    <div className="dropdown-divider"></div>

                    <div className="dropdown-section">
                      <span className="dropdown-section-title">{t('header.language', 'Language')}</span>
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          className={`dropdown-item ${i18n.language === lang.code ? 'active-lang' : ''}`}
                          onClick={() => handleLanguageChange(lang.code)}
                        >
                          <div className="flex items-center" style={{ gap: '10px' }}>
                            <span className="dropdown-flag">{lang.flag}</span>
                            <span>{lang.name}</span>
                          </div>
                          {i18n.language === lang.code && <Check size={14} />}
                        </button>
                      ))}
                    </div>

                    <div className="dropdown-divider"></div>
                    {canAccessMenuItem(currentUser, { permission: 'settings.read' }) && (
                      <Link to="/settings" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                        <Settings size={16} />
                        {t('menu.settings')}
                      </Link>
                    )}
                    <button className="dropdown-item text-red" onClick={onLogout}>
                      <LogOut size={16} />
                      {t('header.logout')} {/* 6. Translated */}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="page-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
