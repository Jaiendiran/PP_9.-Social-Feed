import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import authService from './authService';
import styles from './ForgotPassword.module.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Email validation
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        try {
            await authService.resetPassword(email);
            setSuccess(true);
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to send reset email. Please try again.');
            setLoading(false);
        }
    };

    const handleResend = () => {
        setSuccess(false);
        setEmail('');
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.authCard}>
                    <div className={styles.successIcon}>
                        <FaCheckCircle />
                    </div>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Check Your Email</h1>
                        <p className={styles.subtitle}>
                            We've sent a password reset link to <strong>{email}</strong>
                        </p>
                    </div>

                    <div className={styles.instructions}>
                        <p>Please check your email and click on the link to reset your password.</p>
                        <p>If you don't see the email, check your spam folder.</p>
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            onClick={handleResend}
                            className={styles.resendButton}
                        >
                            Try Different Email
                        </button>
                        <Link to="/login" className={styles.backLink}>
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.authCard}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Reset Password</h1>
                    <p className={styles.subtitle}>
                        Enter your email address and we'll send you a link to reset your password
                    </p>
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError('');
                            }}
                            className={styles.input}
                            placeholder="Enter your email"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <Link to="/login" className={styles.backLink}>
                        ← Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
