import styles from './PostsControls.module.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';


// Home button component
export function HomeBtn() {
  const navigate = useNavigate()

  return (
    <div className={styles.homeIcon} onClick={() => navigate('/PP_9.-Social-Feed/')}>
      <FaHome />
    </div>
  )
}
// Back arrow component
export function BackArrow({ currentPage }) {
  const navigate = useNavigate()

  return (
    <div className={styles.backIcon} onClick={() => navigate(-1)}>
      <FaArrowLeft /> Back
    </div>
  )
}
// New post button
export function NewPostButton() {
  const navigate = useNavigate()

  return (
    <button className={styles.button} onClick={() => navigate('/add')}>
      + Add Post
    </button>
  );
}
// Select all button
export function SelectAllButton({ allSelected, onToggle }) {
  return (
    <button className={styles.button} onClick={onToggle}>
      {allSelected ? 'Deselect All' : 'Select All'}
    </button>
  );
}
// Clear selection button
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
// Delete selected button
export function DeleteSelectedButton({ onDelete }) {
  return (
    <button className={styles.dangerButton} onClick={onDelete}>
      Delete Selected
    </button>
  );
}
// Sorting controls
export function SortControls({ sortBy, sortOrder, onSort }) {
  const toggleSort = key => {
    const newOrder = (sortBy === key && sortOrder === 'asc') ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  const getIcon = key => {
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
}
// Pagination controls
export function PaginationControls({ currentPage, totalPages, onPageChange, setSearchParams }) {
  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageButton}
        onClick={() => {
          onPageChange(currentPage - 1);
          setSearchParams({page: currentPage - 1});
        }}
        disabled={currentPage === 1}
      >
        Prev
      </button>

      <span className={styles.pageIndicator}>Page {currentPage} of {totalPages}</span>

      <button
        className={styles.pageButton}
        onClick={() => {
          onPageChange(currentPage + 1); 
          setSearchParams({page: currentPage + 1});
        }}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
}
// Search bar component
export function SearchBar({ onSearch }) {
  return (
    <input
      name='post search'
      type="text"
      placeholder="Search posts..."
      onChange={e => onSearch(e.target.value)}
      className={styles.searchInput}
    />
  );
}