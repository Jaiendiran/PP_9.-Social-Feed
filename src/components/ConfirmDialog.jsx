import React from 'react';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({ open, title = 'Confirm', message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className={styles.dialog}>
        <h3 id="confirm-title" className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.confirm} onClick={onConfirm}>Yes, delete</button>
          <button className={styles.cancel} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}