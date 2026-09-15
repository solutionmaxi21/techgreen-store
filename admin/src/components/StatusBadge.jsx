import React from 'react';
import { useTranslation } from 'react-i18next';

const StatusBadge = ({ status, type = 'default', label: labelProp }) => {
  const { t, i18n } = useTranslation();
  const normalizedStatus = status?.toString().toLowerCase() || 'unknown';

  const getColor = () => {
    // Green (Good)
    if (['active', 'published', 'instock', 'in stock', 'delivered', 'completed', 'approved', 'verified'].includes(normalizedStatus)) return 'green';

    // Blue (Processing/Info)
    if (['processing', 'shipped'].includes(normalizedStatus)) return 'blue';

    // Orange (Return flow)
    if (['returning', 'returned', 'unverified'].includes(normalizedStatus)) return 'orange';

    // Yellow (Warning)
    if (normalizedStatus.includes('low') || ['pending', 'awaiting_confirmation'].includes(normalizedStatus)) return 'yellow';

    // Red (Bad)
    if (['inactive', 'draft', 'archived', 'outofstock', 'out of stock', 'cancelled', 'rejected'].includes(normalizedStatus)) return 'red';

    // Gray (Default)
    return 'gray';
  };

  const color = getColor();

  // Styles using CSS Variables (hsl) to match your new theme
  const styles = {
    green: { backgroundColor: 'hsl(142 76% 96%)', color: 'hsl(142 76% 36%)', border: '1px solid hsl(142 76% 80%)' },
    blue: { backgroundColor: 'hsl(214 95% 93%)', color: 'hsl(221 83% 53%)', border: '1px solid hsl(214 95% 85%)' },
    yellow: { backgroundColor: 'hsl(48 96% 89%)', color: 'hsl(32 95% 44%)', border: '1px solid hsl(48 96% 75%)' },
    orange: { backgroundColor: 'hsl(33 100% 96%)', color: 'hsl(26 90% 37%)', border: '1px solid hsl(33 100% 80%)' },
    purple: { backgroundColor: 'hsl(262 83% 96%)', color: 'hsl(262 83% 58%)', border: '1px solid hsl(262 83% 85%)' },
    red: { backgroundColor: 'hsl(0 84% 96%)', color: 'hsl(0 84% 60%)', border: '1px solid hsl(0 84% 85%)' },
    gray: { backgroundColor: 'hsl(220 14% 96%)', color: 'hsl(220 12% 40%)', border: '1px solid hsl(220 16% 90%)' },
  };

  const currentStyle = styles[color];

  const statusKey = `status.${normalizedStatus}`;
  const label = labelProp ?? (i18n.exists(statusKey)
    ? t(statusKey)
    : status);

  return (
    <span style={{
      ...currentStyle,
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'capitalize',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      lineHeight: 1.2,
      whiteSpace: 'nowrap'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: currentStyle.color }}></span>
      {label}
    </span>
  );
};

export default StatusBadge;