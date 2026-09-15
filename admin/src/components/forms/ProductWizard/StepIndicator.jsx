import React from 'react';
import { useTranslation } from 'react-i18next';
import './StepIndicator.css';

/**
 * Step Indicator Component
 * Shows visual progress through the wizard steps
 */
const StepIndicator = ({ currentStep, stepValidity }) => {
  const { t } = useTranslation();
  const steps = [
    { number: 1, title: t('wizard.steps.step1_title'), subtitle: t('wizard.steps.step1_sub') },
    { number: 2, title: t('wizard.steps.step2_title'), subtitle: t('wizard.steps.step2_sub') },
    { number: 3, title: t('wizard.steps.step3_title'), subtitle: t('wizard.steps.step3_sub') },
    { number: 4, title: t('wizard.steps.step4_title'), subtitle: t('wizard.steps.step4_sub') }
  ];

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) {
      return stepValidity[stepNumber] ? 'completed' : 'completed-invalid';
    }
    if (stepNumber === currentStep) {
      return 'current';
    }
    return 'upcoming';
  };

  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className={`step ${getStepStatus(step.number)}`}>
            <div className="step-circle">
              {getStepStatus(step.number) === 'completed' ? (
                <svg className="step-checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <span className="step-number">{step.number}</span>
              )}
            </div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-subtitle">{step.subtitle}</div>
            </div>
          </div>

          {index < steps.length - 1 && (
            <div className={`step-connector ${getStepStatus(step.number) === 'completed' ? 'completed' : ''}`}>
              <div className="connector-line"></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;
