import React, { useState } from 'react';
import styles from './PostsControls.module.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

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
      + Add Post
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

export function SortControls({ setSortBy }) {
  return (
    <div className={styles.sortRow}>
      <span className={styles.sortOption} onClick={() => setSortBy('title')}>
        Title <span className={styles.sortIcon}>🔽</span>
      </span>
      <span className={styles.sortOption} onClick={() => setSortBy('date')}>
        Date <span className={styles.sortIcon}>🔽</span>
      </span>
    </div>
  );
}

export function PaginationControls({ currentPage, totalPages, onPageChange }) {
  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageButton}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Prev
      </button>

      <span className={styles.pageIndicator}>Page {currentPage} of {totalPages}</span>

      <button
        className={styles.pageButton}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
}



export function SearchBar({ onSearch }) {
  return (
    <input
      type="text"
      placeholder="Search posts..."
      onChange={e => onSearch(e.target.value)}
      className={styles.searchInput}
    />
  );
}

