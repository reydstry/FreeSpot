import { useState, useEffect, useRef, useCallback } from 'react';
import { healthAPI } from '../services/api';

// Connection check intervals
const INITIAL_CHECK_INTERVAL = 2000; // 2 seconds when disconnected
const CONNECTED_CHECK_INTERVAL = 30000; // 30 seconds when connected
const MAX_RETRY_INTERVAL = 10000; // Max 10 seconds between retries

/**
 * Custom hook for managing backend connection status
 * Auto-retries connection and notifies when backend becomes available
 * @returns {Object} Connection state and methods
 */
export const useBackendConnection = () => {
	const [isConnected, setIsConnected] = useState(false);
	const [isChecking, setIsChecking] = useState(true);
	const [lastCheckTime, setLastCheckTime] = useState(null);
	const [retryCount, setRetryCount] = useState(0);

	const intervalRef = useRef(null);
	const onConnectCallbacksRef = useRef([]);
	const wasConnectedRef = useRef(false);

	// Check backend health
	const checkConnection = useCallback(async () => {
		setIsChecking(true);
		try {
			const isHealthy = await healthAPI.check();
			setLastCheckTime(new Date());

			if (isHealthy) {
				const wasDisconnected = !wasConnectedRef.current;
				setIsConnected(true);
				setRetryCount(0);
				wasConnectedRef.current = true;

				// Trigger callbacks if just reconnected
				if (wasDisconnected) {
					console.log('✅ Backend connected! Triggering data reload...');
					onConnectCallbacksRef.current.forEach((cb) => {
						try {
							cb();
						} catch (e) {
							console.error('Error in onConnect callback:', e);
						}
					});
				}
			} else {
				setIsConnected(false);
				wasConnectedRef.current = false;
				setRetryCount((prev) => prev + 1);
			}
		} catch (error) {
			setIsConnected(false);
			wasConnectedRef.current = false;
			setRetryCount((prev) => prev + 1);
		} finally {
			setIsChecking(false);
		}
	}, []);

	// Register callback for when connection is established
	const onConnect = useCallback((callback) => {
		onConnectCallbacksRef.current.push(callback);

		// Return cleanup function
		return () => {
			onConnectCallbacksRef.current = onConnectCallbacksRef.current.filter(
				(cb) => cb !== callback
			);
		};
	}, []);

	// Manual retry
	const retry = useCallback(() => {
		checkConnection();
	}, [checkConnection]);

	// Setup polling interval
	useEffect(() => {
		// Initial check
		checkConnection();

		// Setup interval based on connection status
		const setupInterval = () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}

			const interval = isConnected
				? CONNECTED_CHECK_INTERVAL
				: Math.min(
						INITIAL_CHECK_INTERVAL * (retryCount + 1),
						MAX_RETRY_INTERVAL
					);

			intervalRef.current = setInterval(checkConnection, interval);
		};

		setupInterval();

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isConnected, retryCount, checkConnection]);

	return {
		isConnected,
		isChecking,
		lastCheckTime,
		retryCount,
		retry,
		onConnect,
	};
};

export default useBackendConnection;
