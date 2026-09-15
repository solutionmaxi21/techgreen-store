import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { Edit2, Check, X, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import './OrderStatusControl.css';

const OrderStatusControl = ({ currentStatus, onUpdateStatus, loading }) => {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const availableStatuses = [
    { value: 'pending', label: t('status.pending') },
    { value: 'processing', label: t('status.processing') },
    { value: 'shipped', label: t('status.shipped') },
    { value: 'delivered', label: t('status.delivered') },
    { value: 'cancelled', label: t('status.cancelled') },
    { value: 'refunded', label: t('status.refunded') },
    { value: 'returned', label: t('status.returned') }
  ];

  const hasChanges = selectedStatus !== currentStatus;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasChanges) return;
    onUpdateStatus(selectedStatus, note);
    setNote('');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedStatus(currentStatus);
    setNote('');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="status-control-card closed">
        <div className="status-info">
          <span className="control-label">{t('orderStatus.label')}</span>
          <StatusBadge status={currentStatus} type="order" />
        </div>
        <button className="btn-secondary small" onClick={() => setIsEditing(true)}>
          <Edit2 size={14} />
          {t('orderStatus.change')}
        </button>
      </div>
    );
  }

  return (
    <div className="status-control-card open">
      <div className="card-header-pro">
        <h3>{t('orderStatus.update')}</h3>
        <button className="btn-close-minimal" onClick={handleCancel}>
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="status-form">
        <div className="form-group">
          <label>{t('orderStatus.target')}</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="pro-select"
            disabled={loading}
          >
            {availableStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{t('orderStatus.note')}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('orderStatus.notePlaceholder')}
            rows="3"
            className="pro-textarea"
            disabled={loading}
          />
          <span className="note-hint">
            <AlertCircle size={12} />
            {t('orderStatus.noteHint')}
          </span>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleCancel}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!hasChanges || loading}
          >
            {loading ? (
              t('orderStatus.updating')
            ) : (
              <>
                <Check size={16} />
                {t('orderStatus.saveChanges')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

OrderStatusControl.propTypes = {
  currentStatus: PropTypes.string.isRequired,
  onUpdateStatus: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default OrderStatusControl;