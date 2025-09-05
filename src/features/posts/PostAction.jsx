import React from 'react';
import styles from './PostAction.module.css';

function PostActions({ postId, isEditing, onEditToggle, onSave, onDelete, isModified }) {
  return (
    <div className={styles.buttonGroup}>
      {postId && !isEditing && (
        <button className={styles.button} onClick={onEditToggle}>
          Edit
        </button>
      )}
      {isEditing && (
        <button
          className={styles.button}
          onClick={onSave}
          disabled={!isModified}
          title={!isModified ? 'No changes to save' : 'Save changes'}
        >
          Save
        </button>
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
