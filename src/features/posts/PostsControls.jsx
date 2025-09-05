import React from 'react';
import styles from './PostsControls.module.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
;

export function BackArrow() {
  const navigate = useNavigate()

  return (
    <div className={styles.backIcon} onClick={() => navigate(-1)}>
      <FaArrowLeft /> Back
    </div>
  )
}

export function NewPostButton() {
  const navigate = useNavigate()

  return (
    <button className={styles.button} onClick={() => navigate('/add')}>
      + New Post
    </button>
  );
}

export function SelectAllButton({ allSelected, onToggle }) {
  return (
    <button className={styles.button} onClick={onToggle}>
      {allSelected ? 'Deselect All' : 'Select All'}
    </button>
  );
}

export function ClearSelectionButton({ disabled, onClear }) {
  return (
    <button
      className={`${styles.button} ${disabled ? styles.disabled : ''}`}
      onClick={onClear}
      disabled={disabled}
    >
      Clear Selection
    </button>
  );
}

export function DeleteSelectedButton({ onDelete }) {
  return (
    <button className={styles.dangerButton} onClick={onDelete}>
      Delete Selected
    </button>
  );
}
