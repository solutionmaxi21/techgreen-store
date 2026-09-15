import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo.png';
import { adminAccessApi } from '../services/apiService';
import './LoginPage.css';

function ForgotAdminPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminAccessApi.requestPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError(reason.message || t('passwordReset.requestError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-wrapper">
      <div className="login-bg-pattern" />
      <section className="login-card">
        <div className="login-header">
          <div className="brand-logo-container">
            <img src={logo} alt="MaxiStore" className="brand-logo-img" />
          </div>
          <h1>{sent ? t('passwordReset.checkEmail') : t('passwordReset.forgotTitle')}</h1>
          <p>{sent ? t('passwordReset.checkEmailDescription') : t('passwordReset.forgotDescription')}</p>
        </div>

        {sent ? (
          <div className="login-success" role="status">
            <CheckCircle2 size={34} />
            <Link className="login-secondary-link" to="/login">
              <ArrowLeft size={16} />
              {t('passwordReset.returnSignIn')}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="login-form">
            <div className="form-group">
              <label htmlFor="reset-email">{t('auth.login.emailLabel')}</label>
              <div className="input-group">
                <div className="input-group-icon"><Mail size={18} /></div>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            </div>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? t('passwordReset.sending') : t('passwordReset.sendLink')}
            </button>
            <Link className="login-secondary-link" to="/login">
              <ArrowLeft size={16} />
              {t('passwordReset.returnSignIn')}
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}

export default ForgotAdminPasswordPage;
