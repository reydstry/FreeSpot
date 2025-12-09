import { useState, useEffect, useRef, useCallback } from 'react';
import {
	WS_MAX_RECONNECT_ATTEMPTS,
	WS_INITIAL_RECONNECT_DELAY,
	WS_MAX_RECONNECT_DELAY,
} from '../constants';

/**
 * Custom hook for managing WebSocket connections to floor detection endpoints
 * @param {string} baseUrl - The base WebSocket URL (will be converted from http to ws)
 * @param {Array} floors - Array of floor objects with id property
 * @param {Function} onMessage - Callback for handling incoming messages
 */
export const useWebSocket = (baseUrl, floors, onMessage) => {
	const wsConnectionsRef = useRef({});
	const wsReconnectAttemptsRef = useRef({});
	const wsReconnectTimeoutsRef = useRef({});
	const isConnectingRef = useRef({});
	const isUnmountedRef = useRef(false);

	// Generate stable key for floor IDs to avoid effect thrash on identity changes
	const floorIdsKey = useRef('');
	const currentFloorIdsKey =
		floors && floors.length > 0
			? floors
					.map((f) => f.id)
					.filter((id) => id !== undefined && id !== null)
					.sort((a, b) => a - b)
					.join(',')
			: '';

	// Only update if key actually changed
	if (floorIdsKey.current !== currentFloorIdsKey) {
		floorIdsKey.current = currentFloorIdsKey;
	}

	const connectToFloor = useCallback(
		(floorId, validFloorIds) => {
			if (isUnmountedRef.current) return;
			if (!validFloorIds.has(floorId)) return;

			// Prevent duplicates
			if (isConnectingRef.current[floorId]) return;
			const existingWs = wsConnectionsRef.current[floorId];
			if (existingWs) {
				if (
					existingWs.readyState === WebSocket.OPEN ||
					existingWs.readyState === WebSocket.CONNECTING
				) {
					return;
				}
			}

			const attempts = wsReconnectAttemptsRef.current[floorId] || 0;
			if (attempts >= WS_MAX_RECONNECT_ATTEMPTS) return;

			isConnectingRef.current[floorId] = true;
			// Convert HTTP(S) to WS(S) properly
			let wsUrl = baseUrl;
			if (wsUrl.startsWith('https://')) {
				wsUrl = wsUrl.replace('https://', 'wss://');
			} else if (wsUrl.startsWith('http://')) {
				wsUrl = wsUrl.replace('http://', 'ws://');
			}
			const fullWsUrl = `${wsUrl}/ws/detection/${floorId}`;
			console.log(
				`🔌 [WS] Connecting to floor ${floorId} (attempt ${attempts + 1}/${WS_MAX_RECONNECT_ATTEMPTS})`
			);

			try {
				const ws = new WebSocket(fullWsUrl);
				wsConnectionsRef.current[floorId] = ws;

				ws.onopen = () => {
					if (isUnmountedRef.current) {
						ws.close();
						return;
					}
					console.log(`✅ [WS] Connected to floor ${floorId}`);
					wsReconnectAttemptsRef.current[floorId] = 0;
					isConnectingRef.current[floorId] = false;
				};

				ws.onmessage = (event) => {
					if (isUnmountedRef.current) return;
					try {
						const data = JSON.parse(event.data);
						// Handle ping/pong
						if (data.type === 'ping') {
							if (ws.readyState === WebSocket.OPEN) {
								ws.send(JSON.stringify({ type: 'pong' }));
							}
							return;
						}
						// Forward message to callback
						if (data && onMessage) {
							onMessage(data, floorId);
						}
					} catch (err) {
						console.error(`❌ [WS] Parse error floor ${floorId}:`, err);
					}
				};

				ws.onerror = (error) => {
					console.error(`❌ [WS] Error floor ${floorId}:`, error);
					isConnectingRef.current[floorId] = false;
				};

				ws.onclose = (event) => {
					console.log(
						`🔌 [WS] Disconnected from floor ${floorId}, code: ${event.code}`
					);
					delete wsConnectionsRef.current[floorId];
					isConnectingRef.current[floorId] = false;

					if (isUnmountedRef.current) return;
					if (!validFloorIds.has(floorId)) return;

					// Reconnect with exponential backoff
					wsReconnectAttemptsRef.current[floorId] =
						(wsReconnectAttemptsRef.current[floorId] || 0) + 1;
					const currentAttempts = wsReconnectAttemptsRef.current[floorId];
					if (currentAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
						const delay = Math.min(
							WS_INITIAL_RECONNECT_DELAY * Math.pow(2, currentAttempts - 1),
							WS_MAX_RECONNECT_DELAY
						);
						if (wsReconnectTimeoutsRef.current[floorId]) {
							clearTimeout(wsReconnectTimeoutsRef.current[floorId]);
						}
						wsReconnectTimeoutsRef.current[floorId] = setTimeout(() => {
							if (!isUnmountedRef.current) {
								delete wsReconnectTimeoutsRef.current[floorId];
								connectToFloor(floorId, validFloorIds);
							}
						}, delay);
					}
				};
			} catch (err) {
				console.error(
					`❌ [WS] Failed to create WebSocket for floor ${floorId}:`,
					err
				);
				isConnectingRef.current[floorId] = false;
				delete wsConnectionsRef.current[floorId];
			}
		},
		[baseUrl, onMessage]
	);

	// Connect/maintain WebSocket connections for floors (diff-based, no full teardown)
	useEffect(() => {
		if (!floors || floors.length === 0) return;

		const validFloorIds = new Set(floors.map((f) => f.id));
		console.log('📋 [WS] Valid floor IDs:', Array.from(validFloorIds));

		// Close connections for floors that no longer exist
		Object.keys(wsConnectionsRef.current).forEach((floorIdStr) => {
			const floorId = parseInt(floorIdStr);
			if (!validFloorIds.has(floorId)) {
				const ws = wsConnectionsRef.current[floorId];
				if (ws) {
					if (
						ws.readyState === WebSocket.OPEN ||
						ws.readyState === WebSocket.CONNECTING
					) {
						ws.close();
					}
				}
				delete wsConnectionsRef.current[floorId];
				delete isConnectingRef.current[floorId];
				delete wsReconnectAttemptsRef.current[floorId];
				if (wsReconnectTimeoutsRef.current[floorId]) {
					clearTimeout(wsReconnectTimeoutsRef.current[floorId]);
					delete wsReconnectTimeoutsRef.current[floorId];
				}
			}
		});

		// Stagger new connections to avoid spikes
		floors.forEach((floor, index) => {
			if (wsReconnectAttemptsRef.current[floor.id] === undefined) {
				wsReconnectAttemptsRef.current[floor.id] = 0;
			}
			setTimeout(() => {
				if (!isUnmountedRef.current) {
					connectToFloor(floor.id, validFloorIds);
				}
			}, index * 100);
		});
	}, [floorIdsKey.current, connectToFloor, floors]);

	// Global unmount cleanup: close everything
	useEffect(() => {
		return () => {
			console.log('🧹 [WS] Unmount: closing all WebSocket connections...');
			isUnmountedRef.current = true;

			// Clear all timeouts
			Object.keys(wsReconnectTimeoutsRef.current).forEach((floorId) => {
				if (wsReconnectTimeoutsRef.current[floorId]) {
					clearTimeout(wsReconnectTimeoutsRef.current[floorId]);
				}
			});
			wsReconnectTimeoutsRef.current = {};

			// Close all connections
			Object.keys(wsConnectionsRef.current).forEach((floorId) => {
				const ws = wsConnectionsRef.current[floorId];
				if (ws) {
					if (
						ws.readyState === WebSocket.OPEN ||
						ws.readyState === WebSocket.CONNECTING
					) {
						ws.close();
					}
				}
			});
			wsConnectionsRef.current = {};
			wsReconnectAttemptsRef.current = {};
			isConnectingRef.current = {};
		};
	}, []);

	return {
		connections: wsConnectionsRef.current,
		isConnected: (floorId) => {
			const ws = wsConnectionsRef.current[floorId];
			return ws && ws.readyState === WebSocket.OPEN;
		},
	};
};

export default useWebSocket;
