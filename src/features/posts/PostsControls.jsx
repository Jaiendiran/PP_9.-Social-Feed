import React, { useState, useEffect, useCallback } from 'react';
import styles from './PostsControls.module.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome, FaTimes } from 'react-icons/fa';


// Home button component
export const HomeBtn = React.memo(function HomeBtn() {
  const navigate = useNavigate()

  return (
    <div className={styles.homeIcon} onClick={() => navigate('/')}>
      <FaHome />
    </div>
  )
});

// Back arrow component
export const BackArrow = React.memo(function BackArrow({ currentPage }) {
  const navigate = useNavigate()

  return (
    <div className={styles.backIcon} onClick={() => navigate(-1)}>
      <FaArrowLeft /> Back
    </div>
  )
});

// New post button
export const NewPostButton = React.memo(function NewPostButton() {
  const navigate = useNavigate()

  return (
    <button className={styles.button} onClick={() => navigate('/add')}>
      + Add Post
    </button>
  );
});

// Select all button
export const SelectAllButton = React.memo(function SelectAllButton({ allSelected, onToggle }) {
  return (
    <button className={styles.button} onClick={onToggle}>
      {allSelected ? 'Deselect All' : 'Select All'}
    </button>
  );
});

// Clear selection button
export const ClearSelectionButton = React.memo(function ClearSelectionButton({ disabled, onClear }) {
  return (
    <button
      className={`${styles.button} ${disabled ? styles.disabled : ''}`}
      onClick={onClear}
      disabled={disabled}
    >
      Clear Selection
    </button>
  );
});

// Delete selected button
export const DeleteSelectedButton = React.memo(function DeleteSelectedButton({ onDelete }) {
  return (
    <button className={styles.dangerButton} onClick={onDelete}>
      Delete Selected
    </button>
  );
});

// Sorting controls
export const SortControls = React.memo(function SortControls({ sortBy, sortOrder, onSort }) {
  const toggleSort = useCallback((key) => {
    const newOrder = (sortBy === key && sortOrder === 'asc') ? 'desc' : 'asc';
    onSort(key, newOrder);
  }, [sortBy, sortOrder, onSort]);

  const getIcon = (key) => {
    if (sortBy !== key) return '⬍';
    return sortOrder === 'asc' ? '🔼' : '🔽';
  };

  return (
    <div className={styles.sortRow}>
      <button
        type="button"
        className={styles.sortOption}
        onClick={() => toggleSort('title')}
      >
        Title <span className={styles.sortIcon}>{getIcon('title')}</span>
      </button>
      <button
        type="button"
        className={styles.sortOption}
        onClick={() => toggleSort('date')}
      >
        Date <span className={styles.sortIcon}>{getIcon('date')}</span>
      </button>
    </div>
  );
});

// Dropdown
export const Dropdown = React.memo(function Dropdown({ selectedOption, onChange }) {
  return (
    <select
      className={styles.dropdown}
      value={selectedOption}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">All</option>
      <option value="created">Created</option>
      <option value="external">External</option>
    </select>
  );
});

// Pagination controls
export const PaginationControls = React.memo(function PaginationControls({ currentPage, totalPages, onPageChange, setSearchParams, itemsPerPage, onItemsPerPageChange }) {
  const handleItemsPerPageChange = useCallback((e) => {
    const value = parseInt(e.target.value, 10);
    onItemsPerPageChange(value);
    // Reset to page 1 when changing items per page
    onPageChange(1);
    setSearchParams({ page: '1' });
  }, [onItemsPerPageChange, onPageChange, setSearchParams]);

  const handlePrevPage = useCallback(() => {
    onPageChange(currentPage - 1);
    setSearchParams({ page: (currentPage - 1).toString() });
  }, [currentPage, onPageChange, setSearchParams]);

  const handleNextPage = useCallback(() => {
    onPageChange(currentPage + 1);
    setSearchParams({ page: (currentPage + 1).toString() });
  }, [currentPage, onPageChange, setSearchParams]);

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationControls}>
        <button
          className={styles.pageButton}
          onClick={handlePrevPage}
          disabled={currentPage === 1}
        >
          Prev
        </button>

        <span className={styles.pageIndicator}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          className={styles.pageButton}
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      <div className={styles.itemsPerPage}>
        <label htmlFor="itemsPerPage">Items per page:</label>
        <select
          id="itemsPerPage"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className={styles.itemsSelect}
        >
          {[5, 10, 25, 50].map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});

// Search bar component
export const SearchBar = React.memo(function SearchBar({ onSearch, initialValue }) {
  const [localValue, setLocalValue] = useState(initialValue || '');

  useEffect(() => {
    setLocalValue(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onSearch]);

  const handleChange = useCallback((e) => {
    setLocalValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue('');
  }, []);

  return (
    <div className={styles.searchWrapper}>
      <input
        name='post search'
        type="text"
        placeholder="Search posts..."
        value={localValue}
        onChange={handleChange}
        className={styles.searchInput}
      />
      {localValue && (
        <button
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="Clear search"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
});