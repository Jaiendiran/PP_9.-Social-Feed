import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';

const PREFS_DOC_ID = 'settings';

// Get user preferences from Firestore
const getUserPreferences = async (uid) => {
    if (!uid) return null;

    try {
        const prefsRef = doc(db, 'users', uid, 'preferences', PREFS_DOC_ID);
        const snapshot = await getDoc(prefsRef);

        if (snapshot.exists()) {
            return snapshot.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        throw error;
    }
};

// Save user preferences to Firestore (merge)
const saveUserPreferences = async (uid, preferences) => {
    if (!uid) return;

    try {
        const prefsRef = doc(db, 'users', uid, 'preferences', PREFS_DOC_ID);
        // Add timestamp for sync comparison
        const prefsWithTimestamp = {
            ...preferences,
            updatedAt: Date.now()
        };
        // Uses setDoc with merge: true to create if not exists or update fields
        await setDoc(prefsRef, prefsWithTimestamp, { merge: true });
        return prefsWithTimestamp;
    } catch (error) {
        console.error('Error saving user preferences:', error);
        throw error;
    }
};

const preferencesService = { getUserPreferences, saveUserPreferences };
export default preferencesService;
