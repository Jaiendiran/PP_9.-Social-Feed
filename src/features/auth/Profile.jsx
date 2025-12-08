import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { updateUserProfile, logout } from './authSlice';
import authService from './authService';
import { auth } from '../../firebase.config';
import ConfirmDialog from '../../components/ConfirmDialog';
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

    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                email: user.email || ''
            });
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
    };

    const handleSaveProfile = async () => {
        setError('');
        setSuccess('');

        if (!formData.displayName.trim()) {
            setError('Display name cannot be empty');
            return;
        }

        try {
            await dispatch(updateUserProfile({
                uid: user.uid,
                data: {
                    displayName: formData.displayName
                }
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
            if (currentUser) {
                await authService.changePassword(currentUser, passwordData.newPassword);
                setPasswordSuccess('Password changed successfully!');
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                setShowPasswordSection(false);
                setTimeout(() => setPasswordSuccess(''), 3000);
            }
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
                <div className={styles.header}>
                    <h1 className={styles.title}>My Profile</h1>
                    <p className={styles.subtitle}>Manage your account settings</p>
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
                            <FaLock /> Change Password
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
                                    <label className={styles.label}>New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        className={styles.input}
                                        placeholder="Enter new password"
                                        required
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
                                    />
                                </div>

                                <div className={styles.actionButtons}>
                                    <button type="submit" className={styles.saveButton}>
                                        <FaSave /> Update Password
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordSection(false);
                                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                            setPasswordError('');
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
        </div>
    );
};

export default Profile;
