import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaUser, FaHome, FaSignOutAlt, FaMoon, FaSun, FaUserCircle } from 'react-icons/fa';
import { logout } from '../features/auth/authSlice';
import { selectTheme, setTheme } from '../features/preferences/preferencesSlice';
import styles from './UserMenu.module.css';

const UserMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const theme = useSelector(selectTheme);

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

    const handleLogout = () => {
        dispatch(logout());
        setIsOpen(false);
        navigate('/login');
    };

    const handleThemeToggle = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        dispatch(setTheme(newTheme));
    };

    if (!user) {
        return null;
    }

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getUserType = () => {
        // You can extend this to check user roles from Firestore
        return user.role === 'Admin' ? 'Admin' : 'User';
    };

    return (
        <div className={styles.userMenuContainer} ref={menuRef}>
            <button
                className={styles.avatarButton}
                onClick={() => setIsOpen(!isOpen)}
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
                        {getInitials(user.displayName || user.email)}
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
                                {getUserType()}
                            </span>
                        </div>
                    </div>

                    <div className={styles.divider}></div>

                    {/* Menu Items */}
                    <div className={styles.menuItems}>
                        <Link
                            to="/"
                            className={styles.menuItem}
                            onClick={() => setIsOpen(false)}
                        >
                            <FaHome className={styles.menuIcon} />
                            <span>Home</span>
                        </Link>
                        <Link
                            to="/profile"
                            className={styles.menuItem}
                            onClick={() => setIsOpen(false)}
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
};

export default UserMenu;
