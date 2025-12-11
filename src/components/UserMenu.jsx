import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaUser, FaHome, FaSignOutAlt, FaMoon, FaSun, FaUserCircle } from 'react-icons/fa';
import { logout, selectUser } from '../features/auth/authSlice';
import { selectTheme, setTheme, resetPreferences, saveUserPreferences } from '../features/preferences/preferencesSlice';
import styles from './UserMenu.module.css';

const UserMenu = React.memo(function UserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(selectUser);
    const theme = useSelector(selectTheme);
    const preferences = useSelector(state => state.preferences);
    const { filters, pagination } = preferences;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleToggleMenu = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const handleMenuClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleThemeToggle = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        dispatch(setTheme(newTheme));
    }, [dispatch, theme]);

    const handleLogout = useCallback(async () => {
        try {
            // 1. Force save current prefs to Firestore before they are lost
            if (user?.uid) {
                await dispatch(saveUserPreferences({
                    uid: user.uid,
                    preferences: { theme, filters, pagination }
                })).unwrap();
            }
        } catch (e) {
            console.error("Save failed or no changes to save", e);
        }

        // 2. Reset preferences state (clears Redux slice)
        dispatch(resetPreferences());

        // 3. Reset DOM immediately to remove dark theme
        document.body.setAttribute('data-theme', 'light');

        // 4. Dispatch logout to clear auth state
        await dispatch(logout());

        // 5. Close menu and navigate
        setIsOpen(false);
        navigate('/login');
    }, [dispatch, navigate, user, theme, filters, pagination]);

    const initials = useMemo(() => {
        if (!user) return 'U';
        const name = user.displayName || user.email;
        if (!name) return 'U';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, [user]);

    const userType = useMemo(() => {
        return user?.role === 'Admin' ? 'Admin' : 'User';
    }, [user?.role]);

    if (!user) {
        return null;
    }

    return (
        <div className={styles.userMenuContainer} ref={menuRef}>
            <button
                className={styles.avatarButton}
                onClick={handleToggleMenu}
                aria-label="User menu"
                aria-expanded={isOpen}
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className={styles.avatar}
                    />
                ) : (
                    <div className={styles.avatarPlaceholder}>
                        {initials}
                    </div>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {/* User Info Section */}
                    <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName || 'User'}
                                    className={styles.userAvatarImage}
                                />
                            ) : (
                                <div className={styles.userAvatarPlaceholder}>
                                    <FaUserCircle />
                                </div>
                            )}
                        </div>
                        <div className={styles.userDetails}>
                            <div className={styles.userName}>{user.displayName || 'User'}</div>
                            <div className={styles.userEmail}>{user.email}</div>
                            <span className={`${styles.userBadge} ${user.role === 'Admin' ? styles.adminBadge : styles.regularBadge}`}>
                                {userType}
                            </span>
                        </div>
                    </div>

                    <div className={styles.divider}></div>

                    {/* Menu Items */}
                    <div className={styles.menuItems}>
                        <Link
                            to="/"
                            className={styles.menuItem}
                            onClick={handleMenuClose}
                        >
                            <FaHome className={styles.menuIcon} />
                            <span>Home</span>
                        </Link>
                        <Link
                            to="/profile"
                            className={styles.menuItem}
                            onClick={handleMenuClose}
                        >
                            <FaUser className={styles.menuIcon} />
                            <span>Profile</span>
                        </Link>

                        <div className={styles.divider}></div>

                        {/* Theme Toggle */}
                        <button
                            className={styles.menuItem}
                            onClick={handleThemeToggle}
                        >
                            {theme === 'dark' ? (
                                <>
                                    <FaSun className={styles.menuIcon} />
                                    <span>Light Mode</span>
                                </>
                            ) : (
                                <>
                                    <FaMoon className={styles.menuIcon} />
                                    <span>Dark Mode</span>
                                </>
                            )}
                        </button>

                        <div className={styles.divider}></div>

                        {/* Logout */}
                        <button
                            className={`${styles.menuItem} ${styles.logoutItem}`}
                            onClick={handleLogout}
                        >
                            <FaSignOutAlt className={styles.menuIcon} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default UserMenu;
