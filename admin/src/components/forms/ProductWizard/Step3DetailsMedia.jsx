import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { productApi } from '../../../services/apiService';
import { normalizeImageUrl } from '../../../utils/imageUrl';
import BilingualInput from '../BilingualInput';
import RichTextEditor from '../RichTextEditor';
import './Step3DetailsMedia.css';

/**
 * Step 3: Details, Media & Attributes
 * Add rich content, images, specifications, and metadata
 */
const Step3DetailsMedia = ({ formData, updateFormData, updateMultipleFields, errors, clearError, setStepValid }) => {
  const { t } = useTranslation();
  const [uploadingImages, setUploadingImages] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [attributeError, setAttributeError] = useState('');
  const fileInputRef = useRef(null);
  const initializedRef = useRef(false);

  // FIX: Ref to track the last validity status sent to parent to prevent infinite loops
  const isStepValidRef = useRef(null);

  // Validate attributes - require at least 3
  useEffect(() => {
    const validAttributes = (formData.attributes || []).filter(
      attr => {
        // Handle bilingual name format
        const name = typeof attr.name === 'object' ? (attr.name?.fr || '') : (attr.name || '');
        return name.trim() && attr.value?.trim();
      }
    );

    const isValidCount = validAttributes.length >= 3;

    // Update local UI error state
    if (!isValidCount) {
      setAttributeError(`${t('wizard.step3.specs_error_min')} (${validAttributes.length}/3)`);
    } else {
      setAttributeError('');
    }

    // FIX: Only call setStepValid if the status has actually changed
    // This prevents "Maximum update depth exceeded" errors
    if (isStepValidRef.current !== isValidCount) {
      isStepValidRef.current = isValidCount;
      setStepValid(isValidCount);
    }
  }, [formData.attributes, setStepValid, t]);

  // Image Upload Handlers
  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    await uploadImages(files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    await uploadImages(files);
  };

  const uploadImages = async (files) => {
    const currentImages = formData.images || [];
    console.log('[uploadImages] Starting batch upload:', { currentImageCount: currentImages.length, filesToUpload: files.length });

    const remainingSlots = 5 - currentImages.length;

    if (remainingSlots <= 0) {
      toast.error(t('errors.max_images'));
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    console.log('[uploadImages] Uploading files:', filesToUpload.map(f => f.name));

    const uploadPromises = filesToUpload.map(file => uploadSingleImage(file));

    const uploadedImages = await Promise.all(uploadPromises);
    console.log('[uploadImages] Upload batch completed:', { results: uploadedImages });

    const successfulUploads = uploadedImages.filter(img => img !== null);
    console.log('[uploadImages] Successful uploads:', { count: successfulUploads.length, images: successfulUploads });

    if (successfulUploads.length > 0) {
      const finalImages = [...currentImages, ...successfulUploads];
      console.log('[uploadImages] Final images array:', { totalCount: finalImages.length, images: finalImages });
      updateFormData('images', finalImages);
    } else {
      console.warn('[uploadImages] No successful uploads, images not updated');
    }
  };

  const uploadSingleImage = async (file) => {
    const uploadId = Date.now() + Math.random();
    console.log('[uploadSingleImage] Starting upload:', { fileName: file.name, fileSize: file.size, uploadId });
    setUploadingImages(prev => [...prev, { id: uploadId, name: file.name, progress: 0 }]);

    try {
      console.log('[uploadSingleImage] Calling uploadImage API for:', file.name);
      const uploadData = await productApi.uploadImage(file);
      console.log('[uploadSingleImage] Upload response received:', uploadData);

      if (!uploadData || !uploadData.url) {
        console.error('[uploadSingleImage] Invalid upload data - missing URL:', uploadData);
        throw new Error('Upload response missing URL');
      }

      setUploadingImages(prev => prev.filter(img => img.id !== uploadId));
      console.log('[uploadSingleImage] Upload completed, creating image object');

      const imageObject = {
        id: `uploaded-${uploadId}`,
        url: uploadData.url,
        image_url: uploadData.url,
        altText: file.name.replace(/\.[^/.]+$/, '') || 'Product image',
        displayOrder: (formData.images?.length || 0) + 1
      };
      console.log('[uploadSingleImage] Image object created:', imageObject);
      return imageObject;
    } catch (error) {
      console.error('[uploadSingleImage] Image upload error:', error);
      setUploadingImages(prev => prev.filter(img => img.id !== uploadId));
      const errorMsg = `${t('errors.upload_failed')} ${file.name}: ${error.message || t('common.unknown_error')}`;
      console.error('[uploadSingleImage] Showing error alert:', errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    // Reorder remaining images
    newImages.forEach((img, idx) => img.displayOrder = idx + 1);
    updateFormData('images', newImages);
  };

  const handleImageAltText = (index, altText) => {
    const newImages = [...(formData.images || [])];
    newImages[index].altText = altText;
    updateFormData('images', newImages);
  };

  const moveImage = (fromIndex, toIndex) => {
    const newImages = [...(formData.images || [])];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    // Update display order
    newImages.forEach((img, idx) => img.displayOrder = idx + 1);
    updateFormData('images', newImages);
  };

  // Specification Handlers
  const addSpecification = () => {
    const newSpec = {
      name: { fr: '', ar: '' }, // Bilingual name
      value: '',
      displayOrder: (formData.attributes?.length || 0) + 1
    };
    updateFormData('attributes', [...(formData.attributes || []), newSpec]);
  };

  // Initialize with 3 empty attributes if none exist (only once on mount)
  useEffect(() => {
    if (!initializedRef.current && (!formData.attributes || formData.attributes.length === 0)) {
      initializedRef.current = true;
      const initialAttributes = [
        { name: { fr: '', ar: '' }, value: '', displayOrder: 1 },
        { name: { fr: '', ar: '' }, value: '', displayOrder: 2 },
        { name: { fr: '', ar: '' }, value: '', displayOrder: 3 }
      ];
      updateFormData('attributes', initialAttributes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const updateSpecification = (index, field, value) => {
    const newSpecs = [...(formData.attributes || [])];
    newSpecs[index][field] = value;
    updateFormData('attributes', newSpecs);
  };

  // Handler for bilingual attribute name updates
  const updateSpecificationName = (index, bilingualValue) => {
    const newSpecs = [...(formData.attributes || [])];
    newSpecs[index].name = bilingualValue;
    updateFormData('attributes', newSpecs);
  };

  // Helper to get display name from bilingual or string
  const getAttributeDisplayName = (name) => {
    if (typeof name === 'object') {
      return name?.fr || name?.ar || '';
    }
    return name || '';
  };

  const removeSpecification = (index) => {
    const currentSpecs = formData.attributes || [];
    // Prevent removing if it would go below 3 attributes
    if (currentSpecs.length <= 3) {
      toast.error(t('errors.min_attributes'));
      return;
    }
    const newSpecs = [...currentSpecs];
    newSpecs.splice(index, 1);
    // Reorder
    newSpecs.forEach((spec, idx) => spec.displayOrder = idx + 1);
    updateFormData('attributes', newSpecs);
  };

  // Tag Handlers
  const handleTagsInput = (e) => {
    const input = e.target.value;
    const tags = input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 20); // Max 20 tags

    updateFormData('tags', tags);
  };

  // Helper for alignment
  const LayoutSpacer = () => (
    <div className="bilingual-input__tabs" style={{ visibility: 'hidden', marginBottom: '0.5rem', opacity: 0 }}>
      <button className="bilingual-input__tab" style={{ padding: '0.375rem 0.75rem', cursor: 'default' }}>&nbsp;</button>
    </div>
  );

  return (
    <div className="wizard-step step3-details-media">
      <div className="step-title">
        <h2>{t('wizard.step3.title')}</h2>
        <p>{t('wizard.step3.subtitle')}</p>
      </div>

      {/* Descriptions Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M4 12h16M4 18h7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('wizard.step3.descriptions_section')}
        </h3>

        <div className="form-group full-width">
          <label htmlFor="shortDescription">
            {t('wizard.step3.short_label')}
          </label>
          <input
            id="shortDescription"
            type="text"
            value={formData.shortDescription || ''}
            onChange={(e) => updateFormData('shortDescription', e.target.value)}
            placeholder={t('wizard.step3.short_placeholder')}
            maxLength={500}
          />
          <div className="field-meta">
            <span className="char-count">{(formData.shortDescription || '').length}/500</span>
            <span className="field-hint">{t('wizard.step3.short_hint')}</span>
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="fullDescription">
            {t('wizard.step3.full_label')}
          </label>
          <RichTextEditor
            id="fullDescription"
            value={formData.fullDescription || ''}
            onChange={(value) => updateFormData('fullDescription', value)}
            placeholder={t('wizard.step3.full_placeholder')}
            maxLength={50000}
          />
        </div>
      </div>

      {/* Images Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('wizard.step3.images_section')}
          <span className="image-count">({(formData.images?.length || 0)}/5)</span>
        </h3>

        {/* Image Upload Area */}
        <div
          className={`image-upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="upload-text">
            <strong>{t('wizard.step3.images_upload_title')}</strong> {t('wizard.step3.images_upload_or')}
          </p>
          <p className="upload-hint">
            {t('wizard.step3.images_upload_hint')}
          </p>
        </div>

        {/* Uploading Progress */}
        {uploadingImages.length > 0 && (
          <div className="upload-progress-list">
            {uploadingImages.map(img => (
              <div key={img.id} className="upload-progress-item">
                <span className="upload-filename">{img.name}</span>
                <div className="upload-spinner"></div>
              </div>
            ))}
          </div>
        )}

        {/* Image Gallery */}
        {formData.images && formData.images.length > 0 && (
          <div className="image-gallery">
            {formData.images.map((image, index) => (
              <div key={index} className="image-card">
                <div className="image-preview">
                  <img src={normalizeImageUrl(image.url)} alt={image.altText || t('wizard.review.labels.name')} />
                  {index === 0 && <span className="primary-badge">{t('wizard.step3.images_primary')}</span>}
                  <button
                    type="button"
                    className="btn-remove-image"
                    onClick={() => handleRemoveImage(index)}
                    title={t('common.delete')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <input
                  type="text"
                  className="alt-text-input"
                  value={image.altText || ''}
                  onChange={(e) => handleImageAltText(index, e.target.value)}
                  placeholder={t('wizard.step3.images_alt_placeholder')}
                  maxLength={200}
                />
                <div className="image-controls">
                  {index > 0 && (
                    <button
                      type="button"
                      className="btn-move"
                      onClick={() => moveImage(index, index - 1)}
                      title={t('common.back')}
                    >
                      ←
                    </button>
                  )}
                  {index < formData.images.length - 1 && (
                    <button
                      type="button"
                      className="btn-move"
                      onClick={() => moveImage(index, index + 1)}
                      title={t('common.next')}
                    >
                      →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Specifications Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('wizard.step3.specs_section')} <span className="required">*</span>
          <button
            type="button"
            className="btn-add-spec"
            onClick={addSpecification}
          >
            {t('wizard.step3.specs_add')}
          </button>
        </h3>

        {attributeError && (
          <div className="validation-message error">
            ⚠️ {attributeError}
          </div>
        )}

        {formData.attributes && formData.attributes.length > 0 ? (
          <div className="specifications-list">
            {formData.attributes.map((spec, index) => (
              <div key={index} className="specification-row specification-row--bilingual">
                <div className="spec-name-bilingual">
                  <BilingualInput
                    id={`spec-name-${index}`}
                    value={typeof spec.name === 'object' ? spec.name : { fr: spec.name || '', ar: '' }}
                    onChange={(value) => updateSpecificationName(index, value)}
                    placeholder={t('wizard.step3.specs_name_placeholder')}
                  />
                </div>
                <div className="spec-value-wrapper" style={{ width: '100%' }}>
                  <LayoutSpacer />
                  <input
                    type="text"
                    className="spec-value"
                    value={spec.value}
                    onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                    placeholder={t('wizard.step3.specs_value_placeholder')}
                    maxLength={500}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="spec-action-wrapper">
                  <LayoutSpacer />
                  <button
                    type="button"
                    className="btn-remove-spec"
                    onClick={() => removeSpecification(index)}
                    title={t('common.delete')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>{t('wizard.step3.specs_empty')}</p>
            <p className="hint-text">{t('wizard.step3.specs_hint')}</p>
          </div>
        )}
      </div>

      {/* Tags & SEO Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('wizard.step3.seo_section')}
        </h3>

        <div className="form-group full-width">
          <label htmlFor="tags">
            {t('wizard.step3.tags_label')}
          </label>
          <input
            id="tags"
            type="text"
            value={(formData.tags || []).join(', ')}
            onChange={handleTagsInput}
            placeholder={t('wizard.step3.tags_placeholder')}
            maxLength={1000}
          />
          <div className="field-meta">
            <span className="tag-count">{(formData.tags || []).length}/20 {t('wizard.review.stats.tags')}</span>
            <span className="field-hint">{t('wizard.step3.tags_hint')}</span>
          </div>
          {formData.tags && formData.tags.length > 0 && (
            <div className="tag-chips">
              {formData.tags.map((tag, index) => (
                <span key={index} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="metaTitle">
              {t('wizard.step3.meta_title_label')}
            </label>
            <input
              id="metaTitle"
              type="text"
              value={formData.metaTitle || ''}
              onChange={(e) => updateFormData('metaTitle', e.target.value)}
              placeholder={formData.name || t('wizard.step3.meta_title_placeholder')}
              maxLength={70}
            />
            <div className="field-meta">
              <span className="char-count">{(formData.metaTitle || '').length}/70</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="metaDescription">
              {t('wizard.step3.meta_desc_label')}
            </label>
            <input
              id="metaDescription"
              type="text"
              value={formData.metaDescription || ''}
              onChange={(e) => updateFormData('metaDescription', e.target.value)}
              placeholder={t('wizard.step3.meta_desc_placeholder')}
              maxLength={160}
            />
            <div className="field-meta">
              <span className="char-count">{(formData.metaDescription || '').length}/160</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('wizard.step3.settings_section')}
        </h3>

        <div className="settings-grid">
          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={formData.isActive || false}
                onChange={(e) => updateFormData('isActive', e.target.checked)}
              />
              <span className="toggle-switch"></span>
              <span className="toggle-text">
                <strong>{t('wizard.step3.active_label')}</strong>
                <small>{t('wizard.step3.active_hint')}</small>
              </span>
            </label>
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={formData.featured || false}
                onChange={(e) => updateFormData('featured', e.target.checked)}
              />
              <span className="toggle-switch"></span>
              <span className="toggle-text">
                <strong>{t('wizard.step3.featured_label')}</strong>
                <small>{t('wizard.step3.featured_hint')}</small>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3DetailsMedia;
