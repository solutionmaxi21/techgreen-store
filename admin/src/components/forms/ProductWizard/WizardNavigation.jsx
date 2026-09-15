import React from 'react';
import { useTranslation } from 'react-i18next';
import './WizardNavigation.css';

/**
 * Wizard Navigation Component
 * Handles Back/Next/Submit navigation buttons
 */
const WizardNavigation = ({
  currentStep,
  onBack,
  onNext,
  onSubmit,
  canProceed,
  isSubmitting,
  totalSteps = 3
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="wizard-navigation">
      <div className="nav-left">
        {!isFirstStep && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
              <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('wizard.navigation.back')}
          </button>
        )}
      </div>

      <div className="nav-center">
        <span className="step-counter">
          {t('wizard.navigation.step_counter', { current: currentStep, total: totalSteps })}
        </span>
      </div>

      <div className="nav-right">
        {isLastStep ? (
          <button
            type="button"
            className="btn-primary btn-submit"
            onClick={onSubmit}
            disabled={!canProceed || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                {t('wizard.navigation.creating_product')}
              </>
            ) : (
              <>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('wizard.navigation.review_submit')}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={onNext}
            disabled={!canProceed || isSubmitting}
          >
            {t('wizard.navigation.next')}
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
              <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default WizardNavigation;
