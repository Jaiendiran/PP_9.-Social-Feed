import React from 'react';
import styles from './PostAction.module.css';

function PostActions({ postId, isEditing, onEditToggle, onSave, onDelete, isModified, onCancel }) {
  return (
    <div className={styles.buttonGroup}>
      {(postId && !isEditing) && (
        <>
            <button className={styles.button} onClick={onEditToggle}> Edit </button>
        </>
      )}
      {isEditing && (
        <>
          <button
          className={styles.button}
          onClick={onSave}
          disabled={!isModified}
          >
            Save
          </button>
          <button className={styles.button} onClick={onCancel}> Cancel </button>
        </>
      )}
      {postId && (
        <button className={styles.deleteButton} onClick={onDelete}>
          Delete
        </button>
      )}
    </div>
  );
}

export default PostActions;
