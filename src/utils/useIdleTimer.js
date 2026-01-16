import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '../features/auth/authSlice';
import { cacheUtils, cacheKeys } from './cacheUtils';

// Events to track for activity
const ACTIVITY_EVENTS = [ 'mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'touchstart', 'touchmove' ];

export const useIdleTimer = (timeoutMs = 20 * 60 * 1000) => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const timerRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    const handleLogout = useCallback(() => {
        if (user) {
            dispatch(logout());
        }
    }, [dispatch, user]);

    const resetTimer = useCallback(() => {
        const now = Date.now();

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(handleLogout, timeoutMs);

        // Update persistence timestamp if throttle passed (every 1 min)
        if (user && now - lastActivityRef.current > 60 * 1000) {
            lastActivityRef.current = now;
            try {
                cacheUtils.set(cacheKeys.USER, user);
            } catch (e) {
                console.warn("Failed to update session timestamp", e);
            }
        }

    }, [handleLogout, timeoutMs, user]);

    useEffect(() => {
        if (!user) return;

        resetTimer();

        const handleActivity = () => resetTimer();

        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, resetTimer]);
};
