import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/apiService';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import logo from '../assets/techgreen-logo.png';
import './LoginPage.css';
import { isAdminPanelUser } from '../utils/accessControl';

const LoginPage = ({ onLogin, theme, onToggleTheme }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);

      if (response.success && response.user) {
        if (isAdminPanelUser(response.user)) {
          onLogin(response.user);
        } else {
          setError(t('auth.errors.accessDeniedAdmin'));
          await authApi.logout();
        }
      } else {
        setError(response.message || t('auth.errors.loginFailed'));
      }
    } catch (err) {
      setError(err.message || t('auth.errors.authenticationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg-gradient"></div>
        <div className="login-bg-orbs">
          <div className="bg-orb bg-orb-1"></div>
          <div className="bg-orb bg-orb-2"></div>
          <div className="bg-orb bg-orb-3"></div>
        </div>
        <div className="login-bg-grid"></div>
      </div>

      {/* Left branding panel (desktop only) */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="branding-badge">
            <Shield size={14} />
            <span>Admin Panel</span>
          </div>
          <h2 className="branding-headline">
            Gérez votre<br />
            <span className="branding-highlight">boutique</span> en toute<br />
            <span className="branding-highlight">confiance</span>
          </h2>
          <p className="branding-sub">
            Tableau de bord complet pour gérer vos produits, commandes, clients et analytics en temps réel.
          </p>
          <div className="branding-features">
            <div className="branding-feature">
              <div className="feature-icon"><Zap size={16} /></div>
              <span>Gestion en temps réel</span>
            </div>
            <div className="branding-feature">
              <div className="feature-icon"><Globe size={16} /></div>
              <span>Bilingue FR / AR</span>
            </div>
            <div className="branding-feature">
              <div className="feature-icon"><Shield size={16} /></div>
              <span>Sécurisé & fiable</span>
            </div>
          </div>
        </div>
        <div className="branding-footer">
          <p>&copy; 2026 {t('common.brandName')}. Tous droits réservés.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-card">
          {/* Mobile logo */}
          <div className="mobile-logo">
            <div className="mobile-logo-icon">
              <img src={logo} alt={t('common.brandName')} />
            </div>
          </div>

          <div className="login-header">
            <h1>{t('auth.login.title')}</h1>
            <p>{t('auth.login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className={`form-group ${focusedField === 'email' ? 'focused' : ''} ${email ? 'has-value' : ''}`}>
              <label htmlFor="email">{t('auth.login.emailLabel')}</label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={t('auth.login.emailLabel')}
                  required
                  autoFocus
                />
                {email && <div className="input-check">✓</div>}
              </div>
            </div>

            <div className={`form-group ${focusedField === 'password' ? 'focused' : ''} ${password ? 'has-value' : ''}`}>
              <label htmlFor="password">{t('auth.login.passwordLabel')}</label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-form-links">
              <Link className="forgot-link" to="/forgot-password">
                {t('passwordReset.forgotLink')}
              </Link>
            </div>

            {error && (
              <div className="error-banner">
                <div className="error-icon">!</div>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              <span className="submit-btn-content">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {t('auth.login.signingIn')}
                  </>
                ) : (
                  <>
                    {t('auth.login.signIn')}
                    <ArrowRight size={18} className="submit-arrow" />
                  </>
                )}
              </span>
              {loading && <div className="submit-loading-bar"></div>}
            </button>
          </form>

          <div className="login-footer">
            <p>{t('auth.login.protectedBy')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
