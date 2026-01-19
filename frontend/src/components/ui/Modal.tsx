import React from "react";
import styles from "./Modal.module.css";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitText?: string;
  submitDisabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = "Submit",
  submitDisabled = false,
  size = "md",
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={`${styles.modalContent} ${styles[size]}`}>
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>{children}</div>

        {onSubmit && (
          <div className={styles.modalFooter}>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={submitDisabled}>
              {submitText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
