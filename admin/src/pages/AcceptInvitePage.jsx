import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminAccessApi } from '../services/apiService';
import logo from '../assets/logo.png';
import './AcceptInvitePage.css';

function AcceptInvitePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [invitation, setInvitation] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    adminAccessApi.validateInvitation(token)
      .then((result) => { if (active) setInvitation(result.invitation); })
      .catch((reason) => { if (active) setError(reason.message || t('invite.invalid')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, t]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError(t('invite.passwordMismatch'));
    if (password.length < 12) return setError(t('invite.passwordLength'));
    setSaving(true);
    try {
      await adminAccessApi.acceptInvitation(token, password);
      setAccepted(true);
    } catch (reason) {
      setError(reason.message || t('invite.acceptError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="invite-page">
      <section className="invite-panel">
        <img src={logo} alt="MaxiStore" />
        {loading ? (
          <div className="invite-state"><Loader2 className="spin" size={28} /><p>{t('invite.validating')}</p></div>
        ) : accepted ? (
          <div className="invite-state success"><CheckCircle2 size={36} /><h1>{t('invite.ready')}</h1><p>{t('invite.readyDesc')}</p><Link to="/login">{t('invite.signIn')}</Link></div>
        ) : invitation ? (
          <>
            <div className="invite-heading"><ShieldCheck size={28} /><div><h1>{t('invite.join')}</h1><p>{invitation.firstName} {invitation.lastName} · {invitation.accessRoleName}</p></div></div>
            <form onSubmit={submit}>
              <label>{t('invite.email')}<input value={invitation.email} disabled /></label>
              <label>{t('invite.newPassword')}<div className="invite-password"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('invite.hidePassword') : t('invite.showPassword')}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
              <label>{t('invite.confirmPassword')}<input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" /></label>
              {error && <p className="invite-error" role="alert">{error}</p>}
              <button className="invite-submit" disabled={saving}>{saving && <Loader2 className="spin" size={17} />} {t('invite.activate')}</button>
            </form>
          </>
        ) : (
          <div className="invite-state"><h1>{t('invite.unavailable')}</h1><p>{error || t('invite.invalid')}</p><Link to="/login">{t('invite.returnSignIn')}</Link></div>
        )}
      </section>
    </main>
  );
}

export default AcceptInvitePage;
