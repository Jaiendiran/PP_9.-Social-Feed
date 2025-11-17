import React from 'react';
import styles from './LoadingSpinner.module.css';

function LoadingSpinner({ size = 'medium' }) {
  return (
    <div className={`${styles.spinnerOverlay} ${styles[size]}`}>
      <div className={styles.spinner}></div>
    </div>
  );
}

export default React.memo(LoadingSpinner);