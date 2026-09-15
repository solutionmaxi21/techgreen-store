import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo.png';
import { adminAccessApi } from '../services/apiService';
import './AcceptInvitePage.css';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function ResetAdminPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!TOKEN_PATTERN.test(token)) {
      setError(t('passwordReset.invalid'));
      setLoading(false);
      return () => { active = false; };
    }

    adminAccessApi.validatePasswordReset(token)
      .then(() => { if (active) setValid(true); })
      .catch((reason) => {
        if (active) setError(reason.message || t('passwordReset.invalid'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, t]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('passwordReset.passwordMismatch'));
      return;
    }
    if (password.length < 12 || !/[0-9]/.test(password)) {
      setError(t('passwordReset.passwordRequirements'));
      return;
    }

    setSaving(true);
    try {
      await adminAccessApi.completePasswordReset(token, password);
      setCompleted(true);
      setValid(false);
    } catch (reason) {
      setError(reason.message || t('passwordReset.completeError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="invite-page">
      <section className="invite-panel">
        <img src={logo} alt="MaxiStore" />
        {loading ? (
          <div className="invite-state">
            <Loader2 className="spin" size={28} />
            <p>{t('passwordReset.validating')}</p>
          </div>
        ) : completed ? (
          <div className="invite-state success">
            <CheckCircle2 size={36} />
            <h1>{t('passwordReset.completeTitle')}</h1>
            <p>{t('passwordReset.completeDescription')}</p>
            <Link to="/login">{t('passwordReset.signIn')}</Link>
          </div>
        ) : valid ? (
          <>
            <div className="invite-heading">
              <ShieldCheck size={28} />
              <div>
                <h1>{t('passwordReset.resetTitle')}</h1>
                <p>{t('passwordReset.resetDescription')}</p>
              </div>
            </div>
            <form onSubmit={submit}>
              <label>
                {t('passwordReset.newPassword')}
                <div className="invite-password">
                  <LockKeyhole size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword
                      ? t('passwordReset.hidePassword')
                      : t('passwordReset.showPassword')}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              <label>
                {t('passwordReset.confirmPassword')}
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>
              <p className="invite-hint">{t('passwordReset.passwordRequirements')}</p>
              {error && <p className="invite-error" role="alert">{error}</p>}
              <button className="invite-submit" disabled={saving}>
                {saving && <Loader2 className="spin" size={17} />}
                {saving ? t('passwordReset.saving') : t('passwordReset.savePassword')}
              </button>
            </form>
          </>
        ) : (
          <div className="invite-state">
            <h1>{t('passwordReset.unavailable')}</h1>
            <p>{error || t('passwordReset.invalid')}</p>
            <Link to="/forgot-password">{t('passwordReset.requestAnother')}</Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default ResetAdminPasswordPage;
