import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTheme, setTheme, preferencesConstants } from '../preferences/preferencesSlice';
import styles from './ThemeProvider.module.css';

export function ThemeProvider({ children }) {
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectTheme);

  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    dispatch(setTheme(newTheme));
  };

  return (
    <div className={styles.themeWrapper}>
      <button 
        className={styles.themeToggle}
        onClick={toggleTheme}
        title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} theme`}
      >
        {currentTheme === 'light' ? '🌙' : '☀️'}
      </button>
      {children}
    </div>
  );
}