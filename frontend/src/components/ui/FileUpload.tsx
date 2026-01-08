import React, { useState } from 'react';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  currentFileUrl?: string;
  disabled?: boolean;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = 'Upload File',
  accept = '.pdf',
  maxSizeMB = 10,
  onFileSelect,
  onFileRemove,
  currentFileUrl,
  disabled = false,
  error,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''));
    
    if (!acceptedExtensions.includes(fileExtension || '')) {
      alert(`Invalid file type. Accepted types: ${accept}`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={styles.fileUploadContainer}>
      {label && <label className={styles.label}>{label}</label>}
      
      {!selectedFile && !currentFileUrl && (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''} ${disabled ? styles.disabled : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className={styles.fileInput}
            onChange={handleChange}
            accept={accept}
            disabled={disabled}
          />
          <label htmlFor="file-upload" className={styles.uploadLabel}>
            <div className={styles.uploadIcon}>📁</div>
            <p className={styles.uploadText}>
              <span className={styles.uploadLink}>Click to upload</span> or drag and drop
            </p>
            <p className={styles.uploadHint}>
              {accept.toUpperCase()} (max {maxSizeMB}MB)
            </p>
          </label>
        </div>
      )}

      {selectedFile && (
        <div className={styles.filePreview}>
          <div className={styles.fileInfo}>
            <span className={styles.fileIcon}>📄</span>
            <div className={styles.fileDetails}>
              <p className={styles.fileName}>{selectedFile.name}</p>
              <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleRemove}
            disabled={disabled}
          >
            ✕
          </button>
        </div>
      )}

      {!selectedFile && currentFileUrl && (
        <div className={styles.filePreview}>
          <div className={styles.fileInfo}>
            <span className={styles.fileIcon}>📄</span>
            <div className={styles.fileDetails}>
              <p className={styles.fileName}>Current file</p>
              <a 
                href={currentFileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.fileLink}
              >
                View file
              </a>
            </div>
          </div>
          {onFileRemove && (
            <button
              type="button"
              className={styles.removeButton}
              onClick={handleRemove}
              disabled={disabled}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
};
