import React, { useEffect } from 'react';
import styles from './Toast.module.css';

function Toast({ open, message, type = 'info', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`} role="status" aria-live="polite">
      <div className={styles.text}>{message}</div>
      <button className={styles.close} onClick={onClose} aria-label="Close toast">✖</button>
    </div>
  );
}

export default React.memo(Toast);