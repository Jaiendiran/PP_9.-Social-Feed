import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { signup, loginWithGoogle, reset } from './authSlice';
import styles from './Signup.module.css';

const Signup = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { user, isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.auth
    );

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // Add optional profile picture URL
    const [photoURL, setPhotoURL] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (isSuccess && user) {
            navigate('/', { replace: true });
        }

        return () => {
            dispatch(reset());
        };
    }, [user, isSuccess, navigate, dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setLocalError('');
    };

    const handlePhotoURLChange = (e) => {
        setPhotoURL(e.target.value);
        setLocalError('');
    };

    const getPasswordStrength = () => {
        const password = formData.password;
        if (!password) return { strength: 0, label: '' };

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        return { strength, label: labels[Math.min(strength - 1, 4)] };
    };

    const passwordStrength = getPasswordStrength();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        // Validation
        if (!formData.email || !formData.email.includes('@')) {
            setLocalError('Please enter a valid email address');
            return;
        }

        if (formData.password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        dispatch(signup({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            photoURL: photoURL?.trim() || ''
        }));
    };

    const handleGoogleSignup = async () => {
        dispatch(loginWithGoogle());
    };

    const displayError = localError || (isError && message);

    return (
        <div className={styles.container}>
            <div className={styles.authCard}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Create Account</h1>
                    <p className={styles.subtitle}>Sign up to get started</p>
                </div>

                {displayError && (
                    <div className={styles.errorMessage}>
                        {displayError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="name" className={styles.label}>
                            Full Name <span className={styles.optional}>(Optional)</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Enter your name"
                            disabled={isLoading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Enter your email"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <div className={styles.passwordWrapper}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="Create a password"
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {formData.password && (
                            <div className={styles.passwordStrength}>
                                <div className={styles.strengthBar}>
                                    <div
                                        className={`${styles.strengthFill} ${styles[`strength${passwordStrength.strength}`]}`}
                                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                                    />
                                </div>
                                <span className={`${styles.strengthLabel} ${styles[`strength${passwordStrength.strength}`]}`}>
                                    {passwordStrength.label}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>
                            Confirm Password
                        </label>
                        <div className={styles.passwordWrapper}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`${styles.input} ${formData.confirmPassword && formData.password !== formData.confirmPassword
                                    ? styles.inputError
                                    : formData.confirmPassword && formData.password === formData.confirmPassword
                                        ? styles.inputSuccess
                                        : ''
                                    }`}
                                placeholder="Confirm your password"
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isLoading}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <span className={styles.validationMessage}>Passwords do not match</span>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="photoURL" className={styles.label}>
                            Profile Picture URL <span className={styles.optional}>(Optional)</span>
                        </label>
                        <input
                            type="url"
                            id="photoURL"
                            name="photoURL"
                            value={photoURL}
                            onChange={handlePhotoURLChange}
                            className={styles.input}
                            placeholder="https://example.com/your-avatar.jpg"
                            disabled={isLoading}
                        />
                        <span className={styles.helpText}>Optional public image URL for your profile avatar</span>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>OR</span>
                </div>

                <button
                    type="button"
                    className={styles.googleButton}
                    onClick={handleGoogleSignup}
                    disabled={isLoading}
                >
                    <FaGoogle className={styles.googleIcon} />
                    Sign up with Google
                </button>

                <div className={styles.footer}>
                    <p className={styles.footerText}>
                        Already have an account?{' '}
                        <Link to="/login" className={styles.link}>
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
