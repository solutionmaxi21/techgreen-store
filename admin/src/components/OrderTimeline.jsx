import React from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import {
  Clock,
  Settings,
  Truck,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Cpu,
  FileText,
  PackageX,
  Warehouse,
  AlertTriangle
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDate } from '../utils/formatters';
import './OrderTimeline.css';

const OrderTimeline = ({ timeline }) => {
  const { t } = useTranslation();
  if (!timeline || timeline.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h2>{t('timeline.title')}</h2>
        </div>
        <div className="timeline-empty-state">
          <Clock size={40} />
          <p>{t('timeline.empty')}</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status, guepexStatus) => {
    // Check for return-related Guepex statuses
    if (guepexStatus) {
      const lowerGuepex = guepexStatus.toLowerCase();
      if (lowerGuepex.includes('retour') || lowerGuepex.includes('retourné')) {
        return <RotateCcw size={16} />;
      }
      if (lowerGuepex.includes('échec') || lowerGuepex.includes('echoué') || lowerGuepex.includes('tentative')) {
        return <PackageX size={16} />;
      }
    }
    
    switch (status.toLowerCase()) {
      case 'pending': return <Clock size={16} />;
      case 'processing': return <Settings size={16} />;
      case 'shipped': return <Truck size={16} />;
      case 'delivered': return <CheckCircle2 size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      case 'refunded': return <RotateCcw size={16} />;
      case 'returned': return <Warehouse size={16} />;
      case 'returning': return <RotateCcw size={16} />;
      default: return <FileText size={16} />;
    }
  };

  // Check if event is a return-related event
  const isReturnEvent = (event) => {
    if (event.status === 'returning' || event.status === 'returned') return true;
    if (event.guepex_status) {
      const gs = event.guepex_status.toLowerCase();
      return gs.includes('retour') || gs.includes('retourné') || gs.includes('échec') || gs.includes('echoué');
    }
    return false;
  };

  return (
    <div className="card pro-timeline-card">
      <div className="card-header">
        <h2>{t('timeline.title')}</h2>
        <span className="badge-count-pro">{t('timeline.events', { count: timeline.length })}</span>
      </div>

      <div className="order-timeline-pro">
        {timeline.map((event, index) => (
          <div key={event.status_history_id || index} className={`timeline-event ${isReturnEvent(event) ? 'return-event' : ''}`}>
            {/* Connector Line */}
            {index < timeline.length - 1 && <div className="timeline-track"></div>}

            {/* Icon/Dot */}
            <div className={`timeline-indicator status-${event.status} ${isReturnEvent(event) ? 'return' : ''}`}>
              {getStatusIcon(event.status, event.guepex_status)}
            </div>

            {/* Main Content */}
            <div className={`timeline-bubble ${isReturnEvent(event) ? 'return-bubble' : ''}`}>
              <div className="bubble-header">
                <div className="status-change-info">
                  <span className="action-label">
                    {isReturnEvent(event) ? 'Return Update' : t('timeline.statusUpdate')}
                  </span>
                  <StatusBadge status={event.status} type="order" />
                  {event.payment_status && (
                    <span className="payment-tag-pro">
                      {t('timeline.payment')}: {event.payment_status}
                    </span>
                  )}
                </div>
                <div className="event-timestamp">
                  {formatDate(event.changed_at)}
                </div>
              </div>

              {/* Guepex status badge */}
              {event.guepex_status && (
                <div className="guepex-status-line">
                  <Truck size={12} />
                  <span className="guepex-status">{event.guepex_status}</span>
                  {event.guepex_reason && (
                    <span className="guepex-reason">
                      <AlertTriangle size={12} />
                      {event.guepex_reason}
                    </span>
                  )}
                </div>
              )}

              {event.notes && (
                <div className="event-note">
                  <MessageSquare size={14} className="note-icon" />
                  <p>"{event.notes}"</p>
                </div>
              )}

              <div className="event-footer">
                <div className="event-actor">
                  {event.changed_by_role === 'admin' ? (
                    <div className="actor-badge admin">
                      <ShieldCheck size={12} />
                      <span>{event.changed_by_name || t('timeline.administrator')}</span>
                    </div>
                  ) : (
                    <div className="actor-badge system">
                      <Cpu size={12} />
                      <span>{event.changed_by_name || t('timeline.system')}</span>
                    </div>
                  )}
                  {event.changed_by_email && (
                    <span className="actor-email">{event.changed_by_email}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

OrderTimeline.propTypes = {
  timeline: PropTypes.arrayOf(
    PropTypes.shape({
      status_history_id: PropTypes.number,
      status: PropTypes.string.isRequired,
      payment_status: PropTypes.string,
      notes: PropTypes.string,
      guepex_status: PropTypes.string,
      guepex_reason: PropTypes.string,
      changed_by_name: PropTypes.string,
      changed_by_email: PropTypes.string,
      changed_by_role: PropTypes.string,
      changed_at: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default OrderTimeline;
