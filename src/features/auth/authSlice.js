import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from './authService';
import { cacheUtils, cacheKeys } from '../../utils/cacheUtils';

// Get user from cache (localStorage), ignoring expiry to allow graceful logout
const getCachedUser = () => {
    try {
        return cacheUtils.get(cacheKeys.USER, true);
    } catch (error) {
        console.warn('Failed to get cached user:', error);
        return null;
    }
};

const isSessionExpired = cacheUtils.isExpired(cacheKeys.USER);

const initialState = {
    user: getCachedUser(),
    isSessionExpired: isSessionExpired && !!getCachedUser(),
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

// Login user
export const login = createAsyncThunk('auth/login', async (user, thunkAPI) => {
    try {
        const userData = await authService.login(user.email, user.password);
        cacheUtils.set(cacheKeys.USER, userData);

        return userData;
    } catch (error) {
        let message =
            (error.response && error.response.data && error.response.data.message) ||
            error.message ||
            error.toString();

        if (message.includes('auth/user-not-found') || message.includes('auth/invalid-credential') || message.includes('auth/invalid-email')) {
            message = 'Invalid user info. Please check your email or sign up.';
        } else if (message.includes('auth/wrong-password')) {
            message = 'Invalid password. Please try again.';
        }

        return thunkAPI.rejectWithValue(message);
    }
});

// Register user
export const signup = createAsyncThunk('auth/signup', async (user, thunkAPI) => {
    try {
        const userData = await authService.signup(user.email, user.password, user.name);
        cacheUtils.set(cacheKeys.USER, userData);

        return userData;
    } catch (error) {
        const message =
            (error.response && error.response.data && error.response.data.message) ||
            error.message ||
            error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Login with Google
export const loginWithGoogle = createAsyncThunk('auth/google', async (_, thunkAPI) => {
    try {
        const userData = await authService.loginWithGoogle();
        cacheUtils.set(cacheKeys.USER, userData);

        return userData;
    } catch (error) {
        const message =
            (error.response && error.response.data && error.response.data.message) ||
            error.message ||
            error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Logout user
export const logout = createAsyncThunk('auth/logout', async () => {
    await authService.logout();

    // cacheUtils.clear(cacheKeys.USER);
    Object.values(cacheKeys).forEach(key => cacheUtils.clear(key));
});

// Fetch current user from Firestore
export const fetchCurrentUser = createAsyncThunk('auth/fetchUser', async (uid, thunkAPI) => {
    try {
        const userData = await authService.getUserDocument(uid);

        if (userData) {
            cacheUtils.set(cacheKeys.USER, userData);
            return userData;
        }

        return thunkAPI.rejectWithValue('User not found');
    } catch (error) {
        const message = error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Update user profile
export const updateUserProfile = createAsyncThunk('auth/updateProfile', async ({ uid, data }, thunkAPI) => {
    try {
        const userData = await authService.updateUserProfile(uid, data);
        cacheUtils.set(cacheKeys.USER, userData);

        return userData;
    } catch (error) {
        const message = error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        },
        setUser: (state, action) => {
            state.user = action.payload;
            if (action.payload) {
                cacheUtils.set(cacheKeys.USER, action.payload);
            } else {
                cacheUtils.clear(cacheKeys.USER);
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })
            .addCase(signup.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(signup.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
            })
            .addCase(signup.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })
            .addCase(loginWithGoogle.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(loginWithGoogle.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
            })
            .addCase(loginWithGoogle.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
            })
            .addCase(fetchCurrentUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
            })
            .addCase(fetchCurrentUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(updateUserProfile.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { reset, setUser } = authSlice.actions;

// Selectors
export const selectUser = state => state.auth.user;
export const selectAuth = state => state.auth;
export const selectAuthStatus = state => ({
    isLoading: state.auth.isLoading,
    isError: state.auth.isError,
    isSuccess: state.auth.isSuccess,
    message: state.auth.message,
});
export const selectIsSessionExpired = state => state.auth.isSessionExpired;

export default authSlice.reducer;
