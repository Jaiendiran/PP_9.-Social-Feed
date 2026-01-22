import React from 'react';
import styles from './DeleteProgressModal.module.css';

export default function DeleteProgressModal({ progress, onCancel, onRetry }) {
  if (!progress) return null;
  const { running, total, processed, success, failed, failedItems } = progress;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h3>Deleting posts...</h3>
        <div className={styles.barWrap}>
          <div className={styles.bar} style={{ width: pct + '%' }} />
        </div>
        <p>{processed} / {total} processed — {success} succeeded, {failed} failed</p>
        {failed > 0 && (
          <details className={styles.failList}>
            <summary>{failed} failed IDs (click to expand)</summary>
            <ul>
              {failedItems && failedItems.slice(0, 200).map(id => <li key={id}>{id}</li>)}
            </ul>
          </details>
        )}
        <div className={styles.actions}>
          {running ? <button onClick={onCancel} className={styles.cancel}>Cancel</button> : null}
          {failed > 0 && !running ? <button onClick={() => onRetry(failedItems)} className={styles.retry}>Retry Failed</button> : null}
        </div>
      </div>
    </div>
  );
}
