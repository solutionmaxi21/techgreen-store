import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { normalizeImageUrl } from '../utils/imageUrl';
import './ImageUploader.css';

function ImageUploader({
  images = [],
  onChange,
  maxImages = 5,
  accept = 'image/*'
}) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length;

    if (remainingSlots <= 0) {
      toast.error(t('imageUploader.maxImages', { count: maxImages }));
      return;
    }

    const filesToAdd = fileArray.slice(0, remainingSlots);

    // For now, create preview URLs (actual upload happens when form is submitted)
    const newImages = [];

    filesToAdd.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push({
            id: Date.now() + Math.random(),
            url: reader.result,
            file: file
          });

          if (newImages.length === filesToAdd.length) {
            onChange([...images, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (imageId) => {
    onChange(images.filter(img => img.id !== imageId));
  };

  return (
    <div className="image-uploader">
      <div className="images-preview">
        {images.map((image) => (
          <div key={image.id} className="image-preview-item">
            <img src={normalizeImageUrl(image.url)} alt={t('imageUploader.preview')} />
            <button
              type="button"
              className="remove-image-btn"
              onClick={() => handleRemove(image.id)}
              aria-label={t('imageUploader.remove')}
            >
              ✕
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <div
            className={`upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleButtonClick}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            <div className="upload-content">
              <span className="upload-icon">📷</span>
              <p className="upload-text">
                {t('imageUploader.drop')}
              </p>
              <p className="upload-hint">
                {t('imageUploader.count', { current: images.length, max: maxImages })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageUploader;
