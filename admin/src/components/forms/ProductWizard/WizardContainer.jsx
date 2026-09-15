import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useConfirmation from '../../../hooks/useConfirmation';
import StepIndicator from './StepIndicator';
import WizardNavigation from './WizardNavigation';
import Step1BasicInfo from './Step1BasicInfo';
import Step2PricingInventory from './Step2PricingInventory';
import Step3DetailsMedia from './Step3DetailsMedia';
import Step4Review from './Step4Review';
import { useWizardState } from '../../../hooks/useWizardState';
import { ChevronLeft } from 'lucide-react';
import { useAutoSave } from '../../../hooks/useAutoSave';
import './WizardContainer.css';

/**
 * Main Wizard Container Component
 * Orchestrates the three-step product creation flow
 */
const WizardContainer = ({ onSubmit, onCancel, isEdit = false, initialData = null, productId = null, barcode = '', onBarcodeUpdate = () => { } }) => {
  const { t, i18n } = useTranslation(); // Added
  const isRTL = i18n.dir() === 'rtl';   // Added for icon flipping
  const {
    currentStep,
    setCurrentStep,
    formData,
    updateFormData,
    updateMultipleFields,
    validationErrors,
    setValidationErrors,
    clearError,
    stepValidity,
    setStepValid,
    resetForm
  } = useWizardState();

  const { confirm, ConfirmationDialog } = useConfirmation();

  const { clearDraft, loadDraft, hasDraft } = useAutoSave(formData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  // Check for draft on mount
  useEffect(() => {
    if (!isEdit && hasDraft()) {
      setShowDraftPrompt(true);
    }
  }, [isEdit, hasDraft]);

  // Load initial data if editing - use ref to prevent infinite loop
  const hasLoadedInitialData = React.useRef(false);
  useEffect(() => {
    if (isEdit && initialData && !hasLoadedInitialData.current) {
      updateMultipleFields(initialData);
      hasLoadedInitialData.current = true;
    }
  }, [isEdit, initialData]); // updateMultipleFields is stable, no need to include

  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (draft) {
      updateMultipleFields(draft);
    }
    setShowDraftPrompt(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftPrompt(false);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 3) {
      // Move to review step
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitForm = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      clearDraft();
      resetForm();
    } catch (error) {
      console.error('Failed to submit product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (await confirm({
      title: t('common.cancel'),
      message: t('wizard.navigation.cancel_confirm'),
      confirmText: t('common.yes'),
      cancelText: t('common.no'),
      type: 'warning'
    })) {
      clearDraft();
      resetForm();
      onCancel();
    }
  };

  const canProceed = stepValidity[currentStep];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            formData={formData}
            updateFormData={updateFormData}
            errors={validationErrors}
            clearError={clearError}
            setStepValid={(isValid) => setStepValid(1, isValid)}
            productId={productId}
            barcode={barcode}
            onBarcodeUpdate={onBarcodeUpdate}
          />
        );
      case 2:
        return (
          <Step2PricingInventory
            formData={formData}
            updateFormData={updateFormData}
            errors={validationErrors}
            clearError={clearError}
            setStepValid={(isValid) => setStepValid(2, isValid)}
            productId={productId}
          />
        );
      case 3:
        return (
          <Step3DetailsMedia
            formData={formData}
            updateFormData={updateFormData}
            updateMultipleFields={updateMultipleFields}
            errors={validationErrors}
            clearError={clearError}
            setStepValid={(isValid) => setStepValid(3, isValid)}
          />
        );
      case 4:
        return (
          <Step4Review
            formData={formData}
            onEdit={(step) => setCurrentStep(step)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Draft Recovery Prompt */}
      {showDraftPrompt && (
        <div className="draft-prompt-overlay">
          <div className="draft-prompt">
            <div className="draft-prompt-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>{t('wizard.draft.title')}</h3>
            <p>{t('wizard.draft.message')}</p>
            <div className="draft-prompt-actions">
              <button className="btn-secondary" onClick={handleDiscardDraft}>
                {t('wizard.draft.discard')}
              </button>
              <button className="btn-primary" onClick={handleLoadDraft}>
                {t('wizard.draft.resume')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Container */}
      <div className="wizard-container">
        <div className="wizard-header">
          <div className="header-left">
            <button
              type="button"
              className="back-button"
              onClick={handleCancel}
              title={t('common.back')}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="page-title-section">
              <h1>{isEdit ? t('wizard.header.edit_title') : t('wizard.header.add_title')}</h1>
              <p className="wizard-subtitle">
                {isEdit ? t('wizard.header.edit_subtitle') : t('wizard.header.add_subtitle')}
              </p>
            </div>
          </div>
        </div>

        {currentStep <= 3 && (
          <StepIndicator currentStep={currentStep} stepValidity={stepValidity} />
        )}

        <div className="wizard-content">
          {renderStep()}
        </div>

        {currentStep === 4 ? (
          <div className="wizard-navigation">
            <div className="nav-left">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentStep(3)}
                disabled={isSubmitting}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('wizard.navigation.back_editing')}
              </button>
            </div>
            <div className="nav-center"></div>
            <div className="nav-right">
              <button
                type="button"
                className="btn-primary btn-submit"
                onClick={handleSubmitForm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    {t('wizard.navigation.creating')}
                  </>
                ) : (
                  <>
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t('wizard.navigation.create')}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <WizardNavigation
            currentStep={currentStep}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmitForm}
            canProceed={canProceed}
            isSubmitting={isSubmitting}
            totalSteps={3}
          />
        )}

        <div className="wizard-footer">
          <button
            type="button"
            className="btn-text-danger"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {t('wizard.navigation.cancel')}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationDialog />
    </>
  );
};

export default WizardContainer;
