import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  AlertCircle,
  PackageCheck,
  Home,
  RotateCcw,
  PackageX,
  Warehouse,
  ArrowLeftRight
} from 'lucide-react';
import './ShipmentTracking.css';

/**
 * Visual tracking timeline for Guepex shipments
 * Shows the current status and progress of the delivery
 * Supports both delivery and return flows
 */
const ShipmentTracking = ({ order }) => {
  const { t } = useTranslation();
  if (!order.tracking_number) {
    return null;
  }

  // Define Guepex delivery flow steps
  const deliverySteps = [
    { 
      key: 'preparation',
      label: t('shipment.steps.preparation'),
      icon: <Package size={20} />,
      description: t('shipment.descriptions.preparation')
    },
    { 
      key: 'expedition',
      label: t('shipment.steps.shipped'),
      icon: <Truck size={20} />,
      description: t('shipment.descriptions.shipped')
    },
    { 
      key: 'transit',
      label: t('shipment.steps.transit'),
      icon: <MapPin size={20} />,
      description: t('shipment.descriptions.transit')
    },
    { 
      key: 'out_for_delivery',
      label: t('shipment.steps.outForDelivery'),
      icon: <PackageCheck size={20} />,
      description: t('shipment.descriptions.outForDelivery')
    },
    { 
      key: 'delivered',
      label: t('shipment.steps.delivered'),
      icon: <CheckCircle size={20} />,
      description: t('shipment.descriptions.delivered')
    }
  ];

  // Define Guepex return flow steps
  const returnSteps = [
    { 
      key: 'delivery_failed',
      label: t('shipment.steps.deliveryFailed'),
      icon: <PackageX size={20} />,
      description: t('shipment.descriptions.deliveryFailed')
    },
    { 
      key: 'return_to_center',
      label: t('shipment.steps.returnCenter'),
      icon: <RotateCcw size={20} />,
      description: t('shipment.descriptions.returnCenter')
    },
    { 
      key: 'return_transit',
      label: t('shipment.steps.returnTransit'),
      icon: <ArrowLeftRight size={20} />,
      description: t('shipment.descriptions.returnTransit')
    },
    { 
      key: 'return_ready',
      label: t('shipment.steps.returnReady'),
      icon: <Warehouse size={20} />,
      description: t('shipment.descriptions.returnReady')
    },
    { 
      key: 'returned',
      label: t('shipment.steps.returned'),
      icon: <CheckCircle size={20} />,
      description: t('shipment.descriptions.returned')
    }
  ];

  // Return statuses (triggers return flow display)
  const returnStatuses = [
    'Retour vers centre',
    'Retourné au centre',
    'Retour transfert',
    'Retour groupé',
    'Retour à retirer',
    'Retour vers vendeur',
    'Retourné au vendeur'
  ];

  // Failure statuses (shows alert but stays in delivery flow)
  const failureStatuses = [
    'Tentative échouée',
    'Echèc livraison',
    'En alerte'
  ];

  // Map Guepex status to delivery step index
  const deliveryStatusMap = {
    'En préparation': 0,
    'Expédié': 1,
    'En transit': 2,
    'Sorti en livraison': 3,
    'Livré': 4,
    // Failure states - stay at step 3 with alert
    'Tentative échouée': 3,
    'Echèc livraison': 3,
    'En alerte': 3,
    'Alerte résolue': 3,
    'En attente': 3,
    'En attente du client': 3
  };

  // Map Guepex status to return step index
  const returnStatusMap = {
    'Echèc livraison': 0,
    'Retour vers centre': 1,
    'Retourné au centre': 1,
    'Retour transfert': 2,
    'Retour groupé': 2,
    'Retour à retirer': 3,
    'Retour vers vendeur': 3,
    'Retourné au vendeur': 4
  };

  const currentStatus = order.shipment_status || 'En préparation';
  const isInReturnFlow = returnStatuses.includes(currentStatus) || order.is_returning;
  const isDeliveryFailed = failureStatuses.includes(currentStatus);
  const isDelivered = currentStatus === 'Livré';
  const isReturned = currentStatus === 'Retourné au vendeur';

  // Select appropriate steps and index
  const trackingSteps = isInReturnFlow ? returnSteps : deliverySteps;
  const statusMap = isInReturnFlow ? returnStatusMap : deliveryStatusMap;
  const currentStepIndex = statusMap[currentStatus] ?? 0;

  // Determine step state: completed, active, pending, failed
  const getStepState = (index) => {
    if (isDeliveryFailed && !isInReturnFlow && index === 3) return 'failed';
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return isDeliveryFailed ? 'failed' : 'active';
    return 'pending';
  };

  // Get failure reason label
  const getFailureReasonLabel = (reason) => {
    const reasonMap = {
      'Téléphone injoignable': t('shipment.reasons.phoneUnreachable'),
      'Client ne répond pas': t('shipment.reasons.noResponse'),
      'Faux numéro': t('shipment.reasons.wrongPhone'),
      'Client absent (reporté)': t('shipment.reasons.absentRescheduled'),
      'Client absent (échoué)': t('shipment.reasons.absentFailed'),
      'Annulé par le client': t('shipment.reasons.cancelled'),
      'Commande double': t('shipment.reasons.duplicate'),
      'Le client n\'a pas commandé': t('shipment.reasons.notOrdered'),
      'Produit erroné': t('shipment.reasons.wrongProduct'),
      'Produit manquant': t('shipment.reasons.missingProduct'),
      'Produit cassé ou défectueux': t('shipment.reasons.damaged'),
      'Client incapable de payer': t('shipment.reasons.cannotPay'),
      'Wilaya erronée': t('shipment.reasons.wrongWilaya'),
      'Commune erronée': t('shipment.reasons.wrongCommune'),
      'Client no-show': t('shipment.reasons.noShow'),
      'Adresse non livrable': t('shipment.reasons.undeliverable')
    };
    return reasonMap[reason] || reason;
  };

  return (
    <div className={`shipment-tracking-card ${isInReturnFlow ? 'return-flow' : ''}`}>
      <div className="tracking-header">
        <div className="tracking-title">
          {isInReturnFlow ? <RotateCcw size={22} /> : <Truck size={22} />}
          <h3>{isInReturnFlow ? t('shipment.returnTracking') : t('shipment.tracking')}</h3>
        </div>
        {isDelivered && (
          <div className="tracking-status delivered">
            <CheckCircle size={18} />
            <span>{t('shipment.delivered')}</span>
          </div>
        )}
        {isReturned && (
          <div className="tracking-status returned">
            <Warehouse size={18} />
            <span>{t('shipment.returned')}</span>
          </div>
        )}
        {isDeliveryFailed && !isInReturnFlow && (
          <div className="tracking-status failed">
            <AlertCircle size={18} />
            <span>{t('shipment.deliveryFailed')}</span>
          </div>
        )}
      </div>

      {/* Return Flow Banner */}
      {isInReturnFlow && !isReturned && (
        <div className="tracking-banner return">
          <RotateCcw size={18} />
          <div>
            <strong>{t('shipment.returningTitle')}</strong>
            <span>{t('shipment.returningDesc')}</span>
          </div>
        </div>
      )}

      {/* Inventory Restored Banner */}
      {isReturned && order.inventory_restored && (
        <div className="tracking-banner success">
          <CheckCircle size={18} />
          <div>
            <strong>{t('shipment.inventoryRestored')}</strong>
            <span>{t('shipment.inventoryRestoredDesc')}</span>
          </div>
        </div>
      )}

      {/* Tracking Timeline */}
      <div className="tracking-timeline">
        {trackingSteps.map((step, index) => {
          const state = getStepState(index);
          
          return (
            <div key={step.key} className={`tracking-step ${state}`}>
              {/* Connector Line */}
              {index < trackingSteps.length - 1 && (
                <div className={`tracking-connector ${state}`}></div>
              )}

              {/* Step Content */}
              <div className="step-icon-wrapper">
                <div className="step-icon">
                  {step.icon}
                </div>
              </div>

              <div className="step-content">
                <div className="step-label">{step.label}</div>
                <div className="step-description">{step.description}</div>
                
                {/* Show timestamp if this is the current step */}
                {state === 'active' && order.updated_at && (
                  <div className="step-timestamp">
                    <Clock size={12} />
                    {new Date(order.updated_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Failure/Alert Status */}
      {(isDeliveryFailed || order.shipment_status_reason) && (
        <div className={`tracking-alert ${isInReturnFlow ? 'return' : 'failed'}`}>
          <AlertCircle size={18} />
          <div>
            <div className="alert-title">
              {isInReturnFlow ? t('shipment.returnReason') : currentStatus}
            </div>
            {order.shipment_status_reason && (
              <div className="alert-description">
                {getFailureReasonLabel(order.shipment_status_reason)}
              </div>
            )}
            {order.delivery_attempts > 0 && !isInReturnFlow && (
              <div className="alert-attempts">
                {t('shipment.deliveryAttempts', { count: order.delivery_attempts })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="tracking-info">
        <div className="info-item">
          <span className="info-label">{t('shipment.trackingNumber')}</span>
          <span className="info-value">{order.tracking_number}</span>
        </div>
        <div className="info-item">
          <span className="info-label">{t('shipment.carrier')}</span>
          <span className="info-value">{order.carrier || 'Guepex'}</span>
        </div>
        {order.guepex_created_at && (
          <div className="info-item">
            <span className="info-label">{t('shipment.shippedOn')}</span>
            <span className="info-value">
              {new Date(order.guepex_created_at).toLocaleDateString()}
            </span>
          </div>
        )}
        {order.returned_at && (
          <div className="info-item">
            <span className="info-label">{t('shipment.returnedOn')}</span>
            <span className="info-value">
              {new Date(order.returned_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

ShipmentTracking.propTypes = {
  order: PropTypes.shape({
    tracking_number: PropTypes.string,
    shipment_status: PropTypes.string,
    shipment_status_reason: PropTypes.string,
    carrier: PropTypes.string,
    guepex_created_at: PropTypes.string,
    updated_at: PropTypes.string,
    is_returning: PropTypes.bool,
    inventory_restored: PropTypes.bool,
    delivery_attempts: PropTypes.number,
    returned_at: PropTypes.string
  }).isRequired
};

export default ShipmentTracking;
