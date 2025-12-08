import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing stream loading and error states PER FLOOR
 * @param {Array} feeds - Array of feed URLs
 * @param {string} floorValue - Current floor value
 * @returns {Object} Stream state management methods and values
 */
export const useStreamStatus = (feeds, floorValue) => {
	// Store states per floor: { floorValue: { errors: {}, loaded: {} } }
	const [floorStates, setFloorStates] = useState({});
	const [refreshKey, setRefreshKey] = useState({});

	// Get current floor state
	const currentFloorState = floorStates[floorValue] || {
		errors: {},
		loaded: {},
	};
	const streamErrors = currentFloorState.errors;
	const streamLoaded = currentFloorState.loaded;

	// Initialize floor state when floor changes (only if not exists)
	useEffect(() => {
		setFloorStates((prev) => {
			if (!prev[floorValue]) {
				return {
					...prev,
					[floorValue]: { errors: {}, loaded: {} },
				};
			}
			return prev;
		});
	}, [floorValue]);

	const handleStreamError = useCallback(
		(idx) => {
			setFloorStates((prev) => ({
				...prev,
				[floorValue]: {
					...prev[floorValue],
					errors: { ...(prev[floorValue]?.errors || {}), [idx]: true },
				},
			}));
		},
		[floorValue]
	);

	const handleStreamLoad = useCallback(
		(idx) => {
			setFloorStates((prev) => ({
				...prev,
				[floorValue]: {
					...prev[floorValue],
					loaded: { ...(prev[floorValue]?.loaded || {}), [idx]: true },
				},
			}));
		},
		[floorValue]
	);

	// Refresh only current floor
	const refreshCurrentFloor = useCallback(() => {
		setFloorStates((prev) => ({
			...prev,
			[floorValue]: { errors: {}, loaded: {} },
		}));
		setRefreshKey((prev) => ({
			...prev,
			[floorValue]: (prev[floorValue] || 0) + 1,
		}));
	}, [floorValue]);

	// Check if at least one stream is loaded successfully for current floor
	const hasLoadedStream = Object.keys(streamLoaded).some(
		(key) => streamLoaded[key] && !streamErrors[key]
	);

	// Check if any stream is still loading for current floor
	const isStreamLoading =
		feeds.length > 0 &&
		feeds.some((_, idx) => !streamLoaded[idx] && !streamErrors[idx]);

	// Count loaded and errored streams for current floor
	const loadedCount = Object.keys(streamLoaded).filter(
		(k) => streamLoaded[k] && !streamErrors[k]
	).length;

	const errorCount = Object.keys(streamErrors).filter(
		(k) => streamErrors[k]
	).length;

	// Check if current floor has any errors
	const hasErrors = errorCount > 0;

	return {
		streamErrors,
		streamLoaded,
		handleStreamError,
		handleStreamLoad,
		hasLoadedStream,
		isStreamLoading,
		loadedCount,
		errorCount,
		hasErrors,
		refreshCurrentFloor,
		refreshKey: refreshKey[floorValue] || 0,
		// Get state for specific floor
		getFloorState: (floor) => floorStates[floor] || { errors: {}, loaded: {} },
	};
};

export default useStreamStatus;
