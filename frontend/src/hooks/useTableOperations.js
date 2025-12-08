import { useState, useEffect, useCallback } from 'react';
import { tablesAPI } from '../services/api';
import { showToast } from '../components/Toast/ToastContainer';
import { DEFAULT_TABLE_STATUS } from '../constants';

/**
 * Custom hook for managing table CRUD operations
 * @param {Array} floors - Array of floor objects
 * @param {boolean} isBackendAvailable - Whether backend is available
 * @returns {Object} Table state and operations
 */
export const useTableOperations = (floors, isBackendAvailable) => {
	const [tables, setTables] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loadingMessage, setLoadingMessage] = useState('');

	// Load tables from backend
	useEffect(() => {
		let cancelled = false;

		const loadTables = async () => {
			try {
				const data = await tablesAPI.getAll();
				if (!cancelled && data && Array.isArray(data)) {
					setTables(
						data.map((t) => {
							// Map floor_id to floor.number from floors array
							const floorObj = floors.find((f) => f.id === t.floor_id);
							return {
								id: t.id,
								name: t.name,
								floor: floorObj
									? floorObj.number
									: (t.floor_id ?? t.floor ?? 1),
								capacity: t.capacity,
								status: t.status || DEFAULT_TABLE_STATUS,
								coords: t.coords,
								width: t.width,
								height: t.height,
								rotation: t.rotation ?? 0.0,
							};
						})
					);
				}
			} catch (error) {
				console.warn('Backend tables fetch failed:', error);
			}
		};

		// Load tables once when floors change
		if (floors.length > 0) {
			loadTables();
		}

		// Listen for table updates (from detection or other sources)
		const handleTableUpdate = () => {
			loadTables();
		};

		window.addEventListener('tables-updated', handleTableUpdate);

		return () => {
			cancelled = true;
			window.removeEventListener('tables-updated', handleTableUpdate);
		};
	}, [floors]);

	const handleStatusChange = useCallback(
		(id, newStatus, skipApiUpdate = false) => {
			setTables((prev) =>
				prev.map((table) =>
					table.id === id ? { ...table, status: newStatus } : table
				)
			);

			// Sync to backend if available and not skipped
			if (isBackendAvailable && !skipApiUpdate) {
				const table = tables.find((t) => t.id === id);
				if (table) {
					tablesAPI
						.update(id, {
							name: table.name,
							capacity: table.capacity,
							status: newStatus,
						})
						.catch((err) => console.warn('Failed to sync table status:', err));
				}
			}
		},
		[isBackendAvailable, tables]
	);

	const handleAddTable = useCallback(
		async (tableData) => {
			console.log('🔵 handleAddTable called with:', tableData);
			setIsLoading(true);
			setLoadingMessage('Menambahkan meja...');

			if (isBackendAvailable) {
				try {
					// Map floor number to floor_id
					let floorId = tableData.floor_id;

					if (!floorId) {
						const floorNum = tableData.floor || tableData.floorId || 1;
						const floorObj = floors.find((f) => f.number === floorNum);

						if (floorObj) {
							floorId = floorObj.id;
							console.log(`✅ Found floor ${floorNum} with ID ${floorId}`);
						} else {
							console.warn(
								'⚠️ Floor not in cache, using floor number as ID:',
								floorNum
							);
							floorId = floorNum;
						}
					} else {
						console.log(`✅ Using provided floor_id: ${floorId}`);
					}

					const payload = {
						name: tableData.name,
						capacity: tableData.capacity,
						floor_id: floorId,
						coords: tableData.coords || [0, 0, 0, 0],
						status: tableData.status || DEFAULT_TABLE_STATUS,
						rotation: tableData.rotation ?? 0.0,
					};

					console.log('📤 Sending to backend:', payload);
					const created = await tablesAPI.create(payload);
					console.log('📥 Backend response:', created);

					// Map floor_id back to floor.number
					const createdFloorObj = floors.find((f) => f.id === created.floor_id);
					const newTable = {
						id: created.id,
						name: created.name,
						floor: createdFloorObj ? createdFloorObj.number : created.floor_id,
						capacity: created.capacity,
						status: created.status,
						coords: created.coords,
						rotation: created.rotation ?? 0.0,
					};

					console.log('✅ Table created successfully:', newTable);
					setTables((prev) => [...prev, newTable]);
					return newTable;
				} catch (error) {
					console.error('❌ Failed to create table:', error);
					console.error(
						'❌ Error details:',
						error.response?.data || error.message
					);
					throw error;
				} finally {
					setIsLoading(false);
					setLoadingMessage('');
				}
			} else {
				console.warn('⚠️ Backend not available, using local fallback');
				// Fallback local (if backend down)
				const newId =
					tables.length > 0 ? Math.max(...tables.map((t) => t.id)) + 1 : 1;
				const newTable = {
					id: newId,
					...tableData,
					status: tableData.status || DEFAULT_TABLE_STATUS,
				};
				setTables((prev) => [...prev, newTable]);
				setIsLoading(false);
				setLoadingMessage('');
				return newTable;
			}
		},
		[isBackendAvailable, floors, tables]
	);

	const handleUpdateTable = useCallback(
		async (id, updates) => {
			setTables((prev) =>
				prev.map((table) =>
					table.id === id ? { ...table, ...updates } : table
				)
			);

			if (isBackendAvailable) {
				const table = tables.find((t) => t.id === id);
				if (table) {
					try {
						const payload = {
							name: updates.name ?? table.name,
							capacity: updates.capacity ?? table.capacity,
							status: updates.status ?? table.status,
						};
						// Include coords if provided (for resize/move operations)
						if (updates.coords) {
							payload.coords = updates.coords;
						}
						// Include rotation if provided
						if (updates.rotation !== undefined) {
							payload.rotation = updates.rotation;
						}
						await tablesAPI.update(id, payload);
						console.log(
							'✅ Table updated in DB:',
							id,
							updates.coords ? 'with coords' : '',
							updates.rotation !== undefined ? 'with rotation' : ''
						);
					} catch (err) {
						console.error('❌ Failed to update table in DB:', err);
					}
				}
			}
		},
		[isBackendAvailable, tables]
	);

	const handleDeleteTable = useCallback(
		async (id) => {
			// Validation: minimum 1 table must exist
			if (tables.length <= 1) {
				showToast('Tidak bisa menghapus! Minimal harus ada 1 meja.', 'error');
				return;
			}

			setIsLoading(true);
			setLoadingMessage('Menghapus meja...');

			try {
				setTables((prev) => prev.filter((table) => table.id !== id));

				if (isBackendAvailable) {
					await tablesAPI.delete(id);
				}
			} catch (error) {
				console.error('Failed to delete table:', error);
			} finally {
				setIsLoading(false);
				setLoadingMessage('');
			}
		},
		[tables.length, isBackendAvailable]
	);

	const handleSaveTables = useCallback(
		(newTables) => {
			setTables(newTables);

			// Sync all tables to backend if available
			if (isBackendAvailable) {
				newTables.forEach((t) => {
					if (t.id) {
						tablesAPI
							.update(t.id, {
								name: t.name,
								capacity: t.capacity,
								status: t.status,
							})
							.catch(() => {});
					}
				});
			}
		},
		[isBackendAvailable]
	);

	return {
		tables,
		setTables,
		isLoading,
		loadingMessage,
		handleStatusChange,
		handleAddTable,
		handleUpdateTable,
		handleDeleteTable,
		handleSaveTables,
	};
};

export default useTableOperations;
