import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function AccessDeniedPage() {
  const { t } = useTranslation();
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div><ShieldX size={42} /><h1>{t('access.denied')}</h1><p style={{ color: 'var(--text-secondary)' }}>{t('access.deniedDesc')}</p><Link to="/">{t('access.returnDashboard')}</Link></div>
    </div>
  );
}

export default AccessDeniedPage;
