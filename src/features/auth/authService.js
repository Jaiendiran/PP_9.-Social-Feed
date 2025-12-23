import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, updateProfile, sendPasswordResetEmail, updatePassword, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase.config';

const googleProvider = new GoogleAuthProvider();
// Always prompt account selection for Google sign-in to avoid silent reuse
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Helper to serialize user data (convert Firestore Timestamps to ISO strings)
const serializeUserData = (userData) => {
    if (!userData) return null;

    const serialized = { ...userData };

    // Convert Firestore Timestamps to ISO strings for Redux serialization
    if (serialized.createdAt?.toDate) {
        serialized.createdAt = serialized.createdAt.toDate().toISOString();
    }
    if (serialized.updatedAt?.toDate) {
        serialized.updatedAt = serialized.updatedAt.toDate().toISOString();
    }

    return serialized;
};

// Create or update user document in Firestore
const createUserDocument = async (user, additionalData = {}) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        // Create new user document
        const { email, displayName, photoURL } = user;
        const createdAt = serverTimestamp();

        try {
            await setDoc(userRef, {
                uid: user.uid,
                email,
                displayName: displayName || '',
                photoURL: photoURL || '',
                role: 'User',
                createdAt,
                updatedAt: createdAt,
                ...additionalData
            });
        } catch (error) {
            console.error('Error creating user document:', error);
            throw error;
        }
    }

    return getUserDocument(user.uid);
};

// Get user document from Firestore
const getUserDocument = async (uid) => {
    if (!uid) return null;

    try {
        const userRef = doc(db, 'users', uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
            const userData = { id: snapshot.id, ...snapshot.data() };
            return serializeUserData(userData);
        }
    } catch (error) {
        console.error('Error fetching user document:', error);
    }

    return null;
};

// Update user document in Firestore
const updateUserDocument = async (uid, data) => {
    if (!uid) return;

    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return getUserDocument(uid);
    } catch (error) {
        console.error('Error updating user document:', error);
        throw error;
    }
};

const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getUserDocument(userCredential.user.uid);
    return userDoc || userCredential.user;
};

const signup = async (email, password, name, photoURL) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update Firebase Auth profile (displayName + optional photoURL)
    const profileUpdates = {};
    if (name) profileUpdates.displayName = name;
    if (photoURL) profileUpdates.photoURL = photoURL;
    if (Object.keys(profileUpdates).length) {
        await updateProfile(userCredential.user, profileUpdates);
    }

    // Create Firestore user document with optional photoURL
    const userDoc = await createUserDocument(userCredential.user, {
        displayName: name || '',
        photoURL: photoURL || ''
    });

    return userDoc;
};

const logout = async () => {
    try {
        // If we stored a Google OAuth access token, try to revoke it first
        const token = sessionStorage.getItem('google_oauth_access_token') || localStorage.getItem('google_oauth_access_token');
        if (token) {
            try {
                // Revoke the token via Google's token revocation endpoint
                await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
            } catch (revErr) {
                console.warn('Failed to revoke Google token:', revErr);
            }
        }

        // Sign out from Firebase Auth
        await signOut(auth);

        // Remove only Google OAuth token keys we stored (avoid opening external pages that may trigger UI)
        try {
            sessionStorage.removeItem('google_oauth_access_token');
        } catch (e) {
            console.warn('Failed to remove google token from sessionStorage:', e);
        }
        try {
            localStorage.removeItem('google_oauth_access_token');
        } catch (e) {
            console.warn('Failed to remove google token from localStorage:', e);
        }
    } catch (err) {
        console.error('Logout failed:', err);
        throw err;
    }
};

const loginWithGoogle = async () => {
    // Ensure provider prompts account selection per call as well
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, googleProvider);

    // Try to extract the OAuth access token so we can revoke it on logout if needed
    try {
        const credential = GoogleAuthProvider.credentialFromResult(userCredential);
        const accessToken = credential?.accessToken;
        if (accessToken) {
            // Store in sessionStorage for short-lived lifetime
            try { sessionStorage.setItem('google_oauth_access_token', accessToken); } catch (e) { console.warn('Failed to store Google token:', e); }
        }
    } catch (e) {
        // Not critical — continue
    }

    // Create user document if it doesn't exist
    const userDoc = await createUserDocument(userCredential.user);

    return userDoc;
};

const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
};

const updateUserProfile = async (uid, data) => {
    // Update Firebase Auth profile (displayName and photoURL)
    const user = auth.currentUser;
    const profileUpdates = {};
    if (user) {
        if (data.displayName !== undefined) profileUpdates.displayName = data.displayName;
        if (data.photoURL !== undefined) profileUpdates.photoURL = data.photoURL;
        if (Object.keys(profileUpdates).length) {
            await updateProfile(user, profileUpdates);
        }
    }

    // Update Firestore document
    return await updateUserDocument(uid, data);
};

const changePassword = async (user, newPassword) => {
    await updatePassword(user, newPassword);
};

const deleteAccount = async (user) => {
    if (!user) return;

    // Delete Firestore document
    try {
        const userRef = doc(db, 'users', user.uid);
        await deleteDoc(userRef);
    } catch (error) {
        console.error('Error deleting user document:', error);
    }

    // Delete Firebase Auth account
    await deleteUser(user);
};

const authService = { login, signup, logout, loginWithGoogle, resetPassword, updateUserProfile, changePassword, deleteAccount, getUserDocument, createUserDocument, updateUserDocument };

export default authService;
