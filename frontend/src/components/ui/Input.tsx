import styles from "./Input.module.css";
import { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = false,
  className = "",
  id: providedId,
  ...props
}) => {
  const generatedId = useId();
  const inputId = providedId || generatedId;

  return (
    <div
      className={`${styles.inputWrapper} ${fullWidth ? styles.fullWidth : ""}`}
    >
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`${styles.input} ${error ? styles.error : ""} ${className}`}
        {...props}
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};
