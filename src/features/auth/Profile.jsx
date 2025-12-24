import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { updateUserProfile, logout } from './authSlice';
import authService from './authService';
import { auth } from '../../firebase.config';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import styles from './Profile.module.css';

const Profile = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isLoading } = useSelector((state) => state.auth);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        email: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [currentPwdStatus, setCurrentPwdStatus] = useState('idle'); // 'idle' | 'verifying' | 'verified' | 'failed'
    const [currentPwdMessage, setCurrentPwdMessage] = useState('');
    const verifyRequestId = useRef(0);

    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const initials = useMemo(() => {
        if (!user) return 'U';
        const name = user.displayName || user.email || '';
        if (!name) return 'U';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, [user]);

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || ''
            });
        }
    }, [user]);

    // no timers: verification is explicit via Verify button

        // Clear sensitive password state when user logs out or changes
        useEffect(() => {
            if (!user) {
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setCurrentPwdStatus('idle');
                setCurrentPwdMessage('');
            }
        }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
        setSuccess('');
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        setPasswordError('');
        setPasswordSuccess('');
                // If user edits currentPassword, reset verification state
                if (name === 'currentPassword') {
                    setCurrentPwdStatus('idle');
                    setCurrentPwdMessage('');
                }
    };

    const verifyCurrentPassword = useCallback(async () => {
            const pwd = (passwordData.currentPassword || '').trim();
            if (!pwd || !user?.email) return;

            // Increment request id and capture local id to avoid out-of-order responses
            verifyRequestId.current += 1;
            const requestId = verifyRequestId.current;

            // Avoid concurrent verifies from being applied out-of-order; mark as verifying
            setCurrentPwdStatus('verifying');
            setCurrentPwdMessage('Verifying...');

            try {
                const credential = EmailAuthProvider.credential(user.email, pwd);
                await reauthenticateWithCredential(auth.currentUser, credential);
                // If a newer request started, ignore this result
                if (verifyRequestId.current !== requestId) return;
                setCurrentPwdStatus('verified');
                setCurrentPwdMessage('Current password verified');
            } catch (err) {
                // If a newer request started, ignore this result
                if (verifyRequestId.current !== requestId) return;
                const code = err?.code || '';
                if (code === 'auth/wrong-password') {
                    setCurrentPwdStatus('failed');
                    setCurrentPwdMessage('Incorrect current password');
                } else if (code === 'auth/user-token-expired' || code === 'auth/requires-recent-login' || code === 'auth/session-expired') {
                    setCurrentPwdStatus('failed');
                    setCurrentPwdMessage('Session expired - please log in again');
                } else {
                    setCurrentPwdStatus('failed');
                    setCurrentPwdMessage('Verification failed');
                }
            }
        }, [passwordData.currentPassword, user]);

    const handleSaveProfile = async () => {
        setError('');
        setSuccess('');

        if (!formData.displayName.trim()) {
            setError('Display name cannot be empty');
            return;
        }

        try {
            const dataToUpdate = {
                displayName: formData.displayName
            };
            if (formData.photoURL !== undefined) dataToUpdate.photoURL = formData.photoURL;

            await dispatch(updateUserProfile({
                uid: user.uid,
                data: dataToUpdate
            })).unwrap();

            setSuccess('Profile updated successfully!');
            setIsEditing(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        }
    };

    const handleCancelEdit = () => {
        setFormData({
            displayName: user.displayName || '',
            email: user.email || ''
        });
        setIsEditing(false);
        setError('');
        setSuccess('');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        // Ensure current password has been verified
        if (currentPwdStatus !== 'verified') {
            setPasswordError('Please verify your current password before changing it.');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                setPasswordError('User not signed in');
                return;
            }

            // Final re-authentication to ensure recent login and to use the exact current password entered
            try {
                const pwd = (passwordData.currentPassword || '').trim();
                const credential = EmailAuthProvider.credential(user.email, pwd);
                await reauthenticateWithCredential(auth.currentUser, credential);
            } catch (reauthErr) {
                setPasswordError('Current password verification failed. Please re-enter your current password.');
                setCurrentPwdStatus('failed');
                setCurrentPwdMessage('Incorrect current password');
                return;
            }

            // Now change the password
            await authService.changePassword(currentUser, passwordData.newPassword);
            // Show success toast and clear sensitive fields
            setToastMessage('Password changed successfully!');
            setToastOpen(true);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setCurrentPwdStatus('idle');
            setCurrentPwdMessage('');
            setShowPasswordSection(false);
            setPasswordSuccess('');
        } catch (err) {
            setPasswordError(err.message || 'Failed to change password');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                await authService.deleteAccount(currentUser);
                dispatch(logout());
                navigate('/login');
            }
        } catch (err) {
            setError(err.message || 'Failed to delete account. Please try logging in again.');
            setShowDeleteDialog(false);
        }
    };

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.message}>Please log in to view your profile.</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.profileCard}>
                <div className={styles.profileHeaderRow}>
                    <div>
                        <h1 className={styles.title}>My Profile</h1>
                        <p className={styles.subtitle}>Manage your account settings</p>
                    </div>
                    <div className={styles.profileAvatarContainer}>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || 'User avatar'} className={styles.profileAvatar} onError={(e)=>{e.target.onerror=null; e.target.src='https://www.gravatar.com/avatar/?d=mp&s=120'}} />
                        ) : (
                            <div className={styles.profileAvatarPlaceholder}>{initials}</div>
                        )}
                        {/* Role badge below avatar */}
                        <div className={styles.roleWrapper}>
                            <span className={`${styles.roleBadge} ${user?.role === 'Admin' ? styles.roleAdmin : styles.roleUser}`}>
                                {user?.role || 'User'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className={styles.successMessage}>{success}</div>
                )}
                {error && (
                    <div className={styles.errorMessage}>{error}</div>
                )}

                {/* Profile Information Section */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <FaUser /> Profile Information
                        </h2>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className={styles.editButton}
                                disabled={isLoading}
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <FaUser /> Display Name
                        </label>
                        <input
                            type="text"
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleChange}
                            className={styles.input}
                            disabled={!isEditing || isLoading}
                            placeholder="Enter your display name"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <FaEnvelope /> Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            className={styles.input}
                            disabled
                            title="Email cannot be changed"
                        />
                        <span className={styles.helpText}>Email address cannot be changed</span>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Profile Picture URL
                        </label>
                        <input
                            type="url"
                            name="photoURL"
                            value={formData.photoURL || ''}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="https://example.com/avatar.jpg"
                            disabled={!isEditing || isLoading}
                        />
                        <span className={styles.helpText}>Optional public image URL for your profile</span>
                    </div>

                    {isEditing && (
                        <div className={styles.actionButtons}>
                            <button
                                onClick={handleSaveProfile}
                                className={styles.saveButton}
                                disabled={isLoading}
                            >
                                <FaSave /> Save Changes
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className={styles.cancelButton}
                                disabled={isLoading}
                            >
                                <FaTimes /> Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Change Password Section */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <FaLock /> Privacy Section
                        </h2>
                        {!showPasswordSection && (
                            <button
                                onClick={() => setShowPasswordSection(true)}
                                className={styles.editButton}
                            >
                                Change Password
                            </button>
                        )}
                    </div>

                    {showPasswordSection && (
                        <>
                            {passwordSuccess && (
                                <div className={styles.successMessage}>{passwordSuccess}</div>
                            )}
                            {passwordError && (
                                <div className={styles.errorMessage}>{passwordError}</div>
                            )}

                            <form onSubmit={handleChangePassword}>
                                <div className={styles.formGroup}>
                                        <label className={styles.label}>Current Password</label>
                                        <div className={styles.row}>
                                            <input
                                                type="password"
                                                name="currentPassword"
                                                value={passwordData.currentPassword}
                                                onChange={handlePasswordChange}
                                                className={styles.input}
                                                placeholder="Enter current password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={verifyCurrentPassword}
                                                className={styles.verifyButton}
                                                disabled={!passwordData.currentPassword.trim() || currentPwdStatus === 'verifying'}
                                            >
                                                {currentPwdStatus === 'verifying' ? 'Verifying…' : 'Verify'}
                                            </button>
                                        </div>
                                        {/* Inline verification feedback */}
                                        {currentPwdStatus === 'verified' && (
                                            <div className={styles.successMessage}>{currentPwdMessage}</div>
                                        )}
                                        {currentPwdStatus === 'failed' && (
                                            <div className={styles.errorMessage}>{currentPwdMessage}</div>
                                        )}
                                </div>

                                <div className={styles.formGroup}>
                                        <label className={styles.label}>New Password</label>
                                        <input
                                            type="password"
                                                name="newPassword"
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordChange}
                                                // verification is explicit via Verify button
                                                className={styles.input}
                                                placeholder="Enter new password"
                                                required
                                                disabled={currentPwdStatus !== 'verified'}
                                        />
                                </div>

                                <div className={styles.formGroup}>
                                        <label className={styles.label}>Confirm New Password</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={passwordData.confirmPassword}
                                            onChange={handlePasswordChange}
                                            className={styles.input}
                                            placeholder="Confirm new password"
                                            required
                                            disabled={currentPwdStatus !== 'verified'}
                                        />
                                </div>

                                <div className={styles.actionButtons}>
                                    <button type="submit" className={styles.saveButton} disabled={currentPwdStatus !== 'verified'}>
                                        <FaSave /> Update Password
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                        setShowPasswordSection(false);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                        setPasswordError('');
                                        setCurrentPwdStatus('idle');
                                        setCurrentPwdMessage('');
                                        }}
                                        className={styles.cancelButton}
                                    >
                                        <FaTimes /> Cancel
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                {/* Danger Zone - Delete Account */}
                <div className={`${styles.section} ${styles.dangerZone}`}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <FaTrash /> Danger Zone
                        </h2>
                    </div>
                    <p className={styles.dangerText}>
                        Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                        onClick={() => setShowDeleteDialog(true)}
                        className={styles.deleteButton}
                    >
                        <FaTrash /> Delete Account
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteDialog && (
                <ConfirmDialog
                    title="Delete Account"
                    message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted."
                    onConfirm={handleDeleteAccount}
                    onCancel={() => setShowDeleteDialog(false)}
                    confirmText="Delete Account"
                    cancelText="Cancel"
                />
            )}
            {/* Global toast for success/failure messages */}
            <Toast open={toastOpen} message={toastMessage} type="success" onClose={() => setToastOpen(false)} />
        </div>
    );
};

export default Profile;
