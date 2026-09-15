import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/apiService';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.png';
import './LoginPage.css';
import { isAdminPanelUser } from '../utils/accessControl';

const LoginPage = ({ onLogin, theme, onToggleTheme }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <div className="login-bg-pattern"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="brand-logo-container">
            <img src={logo} alt="MaxiStore" className="brand-logo-img" />
          </div>
          <h1>{t('auth.login.title')}</h1>
          <p>{t('auth.login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">{t('auth.login.emailLabel')}</label>
            {/* UPDATED CLASS NAME: input-group */}
            <div className="input-group">
              {/* UPDATED CLASS NAME: input-group-icon */}
              <div className="input-group-icon">
                <Mail size={18} />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@maxistore.com"
                required
                autoFocus
              // No specific class needed, forms.css targets this structure
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.login.passwordLabel')}</label>
            {/* UPDATED CLASS NAME: input-group */}
            <div className="input-group has-action">
              <div className="input-group-icon">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {/* UPDATED CLASS NAME: input-group-action */}
              <button
                type="button"
                className="input-group-action"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-form-links">
            <Link className="login-text-link" to="/forgot-password">
              {t('passwordReset.forgotLink')}
            </Link>
          </div>

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            title={loading ? t('auth.login.signingIn') : ''}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {t('auth.login.signingIn')}
              </>
            ) : (
              <>
                {t('auth.login.signIn')}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>{t('auth.login.protectedBy')}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
