import { useState } from 'react';

/**
 * Custom hook for managing wizard form state
 * Handles all form data, validation errors, and step validity
 */
export const useWizardState = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: '',
    sku: '',
    serialNumber: '',
    brand: '',
    categoryId: null,
    supplierId: null,
    modelNumber: '',

    // Step 2: Pricing & Inventory
    costPrice: '',
    currentPrice: '',
    salePrice: '',
    productFees: '',
    warehouseId: 1, // Default warehouse
    stock: '',
    reorderLevel: 5,
    weight: '',
    warrantyMonths: 12,

    // Step 3: Details & Media
    shortDescription: '',
    fullDescription: '',
    images: [],
    attributes: [],
    variants: [],
    hasVariants: false,
    tags: [],
    metaTitle: '',
    metaDescription: '',
    isActive: true,
    featured: false
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [stepValidity, setStepValidity] = useState({
    1: false,
    2: false,
    3: false
  });

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateMultipleFields = (updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const clearError = (field) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const setStepValid = (step, isValid) => {
    setStepValidity(prev => ({
      ...prev,
      [step]: isValid
    }));
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      sku: '',
      serialNumber: '',
      brand: '',
      categoryId: null,
      supplierId: null,
      modelNumber: '',
      costPrice: '',
      currentPrice: '',
      salePrice: '',
      productFees: '',
      warehouseId: 1,
      stock: '',
      reorderLevel: 5,
      weight: '',
      warrantyMonths: 12,
      shortDescription: '',
      fullDescription: '',
      images: [],
      attributes: [],
      variants: [],
      hasVariants: false,
      tags: [],
      metaTitle: '',
      metaDescription: '',
      isActive: true,
      featured: false
    });
    setValidationErrors({});
    setStepValidity({ 1: false, 2: false, 3: false });
  };

  return {
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    updateFormData,
    updateMultipleFields,
    validationErrors,
    setValidationErrors,
    clearError,
    stepValidity,
    setStepValid,
    resetForm
  };
};
