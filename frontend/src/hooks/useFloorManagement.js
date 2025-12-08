import { useState, useEffect, useCallback } from 'react';
import { floorsAPI } from '../services/api';
import { showToast } from '../components/Toast/ToastContainer';

/**
 * Custom hook for managing floor CRUD operations
 * @returns {Object} Floor state and operations
 */
export const useFloorManagement = () => {
	const [floors, setFloors] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loadingMessage, setLoadingMessage] = useState('');
	const [isBackendAvailable, setIsBackendAvailable] = useState(false);

	// Load floors from DB
	useEffect(() => {
		let cancelled = false;

		const loadFloors = async () => {
			try {
				const data = await floorsAPI.getAll();
				if (!cancelled && data && Array.isArray(data)) {
					setFloors(data);
					setIsBackendAvailable(true);
				}
			} catch (error) {
				console.warn('Backend floors fetch failed:', error);
			}
		};

		loadFloors();

		return () => {
			cancelled = true;
		};
	}, []);

	const addFloor = useCallback(async (floorData) => {
		setIsLoading(true);
		setLoadingMessage('Menambah lantai baru...');
		try {
			const created = await floorsAPI.create(floorData);
			setFloors((prev) => [...prev, created]);
			return created;
		} catch (error) {
			console.error('Failed to create floor:', error);
			showToast(`Gagal menambah lantai: ${error.message}`, 'error');
			throw error;
		} finally {
			setIsLoading(false);
			setLoadingMessage('');
		}
	}, []);

	const deleteFloor = useCallback(async (floorId) => {
		setIsLoading(true);
		setLoadingMessage('Menghapus lantai...');
		try {
			await floorsAPI.delete(floorId);
			setFloors((prev) => prev.filter((f) => f.id !== floorId));
		} catch (error) {
			console.error('Failed to delete floor:', error);
			showToast(`Gagal menghapus lantai: ${error.message}`, 'error');
			throw error;
		} finally {
			setIsLoading(false);
			setLoadingMessage('');
		}
	}, []);

	const getFloorByNumber = useCallback(
		(floorNum) => {
			return floors.find((f) => f.number === floorNum);
		},
		[floors]
	);

	const getFloorById = useCallback(
		(floorId) => {
			return floors.find((f) => f.id === floorId);
		},
		[floors]
	);

	// Get sorted floor numbers
	const floorNumbers = floors.map((f) => f.number).sort((a, b) => a - b);

	return {
		floors,
		setFloors,
		floorNumbers,
		isLoading,
		loadingMessage,
		isBackendAvailable,
		addFloor,
		deleteFloor,
		getFloorByNumber,
		getFloorById,
	};
};

export default useFloorManagement;
