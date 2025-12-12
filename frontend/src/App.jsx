import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TablePage from './pages/TablePage';
import EditLayoutPage from './pages/EditLayoutPage';
import SettingsPage from './pages/SettingsPage';
import { tablesAPI, floorsAPI } from './services/api';
import { showToast } from './components/Toast/ToastContainer';
import { DEFAULT_TABLE_STATUS } from './constants';
import { useBackendConnection } from './hooks';

export default function App() {
	const [activePage, setActivePage] = useState('meja');
	const [tables, setTables] = useState([]);
	const [floors, setFloors] = useState([]);
	const [isMinimized, setIsMinimized] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [loadingMessage, setLoadingMessage] = useState('');
	const [initialLoadDone, setInitialLoadDone] = useState(false);

	// Backend connection management
	const { isConnected, isChecking, retry, onConnect } = useBackendConnection();
	const floorsRef = useRef(floors);

	// Keep floorsRef in sync
	useEffect(() => {
		floorsRef.current = floors;
	}, [floors]);

	// Load all data function
	const loadAllData = useCallback(async () => {
		console.log('🔄 Loading all data from backend...');
		try {
			// Load floors first
			const floorsData = await floorsAPI.getAll();
			if (floorsData && Array.isArray(floorsData)) {
				setFloors(floorsData);
				console.log('✅ Floors loaded:', floorsData.length);

				// Then load tables with the new floors data
				const tablesData = await tablesAPI.getAll();
				if (tablesData && Array.isArray(tablesData)) {
					setTables(
						tablesData.map((t) => {
							const floorObj = floorsData.find((f) => f.id === t.floor_id);
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
					console.log('✅ Tables loaded:', tablesData.length);
				}

				setInitialLoadDone(true);
				if (!initialLoadDone) {
					showToast('Data berhasil dimuat dari server', 'success');
				}
			}
		} catch (error) {
			console.warn('❌ Failed to load data:', error);
		}
	}, [initialLoadDone]);

	// Register callback for when backend connects
	useEffect(() => {
		const unsubscribe = onConnect(() => {
			loadAllData();
		});

		return unsubscribe;
	}, [onConnect, loadAllData]);

	// Initial load when backend is already connected
	useEffect(() => {
		if (isConnected && !initialLoadDone) {
			loadAllData();
		}
	}, [isConnected, initialLoadDone, loadAllData]);

	// Listen for table updates from WebSocket/detection
	useEffect(() => {
		const handleTableUpdate = () => {
			if (isConnected) {
				// Reload tables only
				tablesAPI.getAll().then((data) => {
					if (data && Array.isArray(data)) {
						setTables(
							data.map((t) => {
								const floorObj = floorsRef.current.find(
									(f) => f.id === t.floor_id
								);
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
				});
			}
		};

		window.addEventListener('tables-updated', handleTableUpdate);
		return () =>
			window.removeEventListener('tables-updated', handleTableUpdate);
	}, [isConnected]);

	// Table status change handler
	const handleStatusChange = useCallback(
		(id, newStatus, skipApiUpdate = false) => {
			setTables((prev) =>
				prev.map((table) =>
					table.id === id ? { ...table, status: newStatus } : table
				)
			);

			if (isConnected && !skipApiUpdate) {
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
		[isConnected, tables]
	);

	// Add table handler
	const handleAddTable = useCallback(
		async (tableData) => {
			console.log('🔵 handleAddTable called with:', tableData);
			setIsLoading(true);
			setLoadingMessage('Menambahkan meja...');

			try {
				if (isConnected) {
					let floorId = tableData.floor_id;

					if (!floorId) {
						const floorNum = tableData.floor || tableData.floorId || 1;
						const floorObj = floors.find((f) => f.number === floorNum);

						if (floorObj) {
							floorId = floorObj.id;
							console.log(`✅ Found floor ${floorNum} with ID ${floorId}`);
						} else {
							console.warn('⚠️ Floor not in cache, using floor number as ID');
							floorId = floorNum;
						}
					}

					const payload = {
						name: tableData.name,
						capacity: tableData.capacity,
						floor_id: floorId,
						coords: tableData.coords || [0, 0, 0, 0],
						status: tableData.status || DEFAULT_TABLE_STATUS,
						rotation: tableData.rotation ?? 0.0,
					};

					const created = await tablesAPI.create(payload);
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
				} else {
					const newId =
						tables.length > 0 ? Math.max(...tables.map((t) => t.id)) + 1 : 1;
					const newTable = {
						id: newId,
						...tableData,
						status: tableData.status || DEFAULT_TABLE_STATUS,
					};
					setTables((prev) => [...prev, newTable]);
					return newTable;
				}
			} catch (error) {
				console.error('❌ Failed to create table:', error);
				throw error;
			} finally {
				setIsLoading(false);
				setLoadingMessage('');
			}
		},
		[isConnected, floors, tables]
	);

	// Update table handler
	const handleUpdateTable = useCallback(
		async (id, updates) => {
			setTables((prev) =>
				prev.map((table) =>
					table.id === id ? { ...table, ...updates } : table
				)
			);

			if (isConnected) {
				const table = tables.find((t) => t.id === id);
				if (table) {
					try {
						const payload = {
							name: updates.name ?? table.name,
							capacity: updates.capacity ?? table.capacity,
							status: updates.status ?? table.status,
						};
						if (updates.coords) payload.coords = updates.coords;
						if (updates.rotation !== undefined)
							payload.rotation = updates.rotation;

						await tablesAPI.update(id, payload);
						console.log('✅ Table updated in DB:', id);
					} catch (err) {
						console.error('❌ Failed to update table in DB:', err);
					}
				}
			}
		},
		[isConnected, tables]
	);

	// Delete table handler
	const handleDeleteTable = useCallback(
		async (id) => {
			if (tables.length <= 1) {
				showToast('Tidak bisa menghapus! Minimal harus ada 1 meja.', 'error');
				return;
			}

			setIsLoading(true);
			setLoadingMessage('Menghapus meja...');

			try {
				setTables((prev) => prev.filter((table) => table.id !== id));
				if (isConnected) {
					await tablesAPI.delete(id);
				}
			} catch (error) {
				console.error('Failed to delete table:', error);
			} finally {
				setIsLoading(false);
				setLoadingMessage('');
			}
		},
		[tables.length, isConnected]
	);

	// Add floor handler
	const handleAddFloor = useCallback(async (floorData) => {
		setIsLoading(true);
		setLoadingMessage('Menambah lantai baru...');
		try {
			const created = await floorsAPI.create(floorData);
			setFloors((prev) => [...prev, created]);
			return created;
		} catch (error) {
			console.error('Failed to create floor:', error);
			throw error;
		} finally {
			setIsLoading(false);
			setLoadingMessage('');
		}
	}, []);

	// Delete floor handler
	const handleDeleteFloor = useCallback(async (floorId) => {
		setIsLoading(true);
		setLoadingMessage('Menghapus lantai...');
		try {
			await floorsAPI.delete(floorId);
			setFloors((prev) => prev.filter((f) => f.id !== floorId));
		} catch (error) {
			console.error('Failed to delete floor:', error);
			throw error;
		} finally {
			setIsLoading(false);
			setLoadingMessage('');
		}
	}, []);

	// Save tables handler
	const handleSaveTables = useCallback(
		(newTables) => {
			setTables(newTables);

			if (isConnected) {
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
		[isConnected]
	);

	return (
		<div className='flex h-screen w-full bg-primary'>
			<Sidebar
				activePage={activePage}
				setActivePage={setActivePage}
				isMinimized={isMinimized}
				setIsMinimized={setIsMinimized}
			/>

			<div className='flex-1 flex flex-col overflow-hidden'>
				<main className='flex-1 overflow-y-auto bg-secondary/85 p-6'>
					{activePage === 'meja' && (
						<TablePage
							tables={tables}
							floors={floors}
							onStatusChange={handleStatusChange}
							isBackendConnected={isConnected}
						/>
					)}
					{activePage === 'edit' && (
						<EditLayoutPage
							tables={tables}
							floors={floors}
							onSaveTables={handleSaveTables}
							onAddTable={handleAddTable}
							onUpdateTable={handleUpdateTable}
							onDeleteTable={handleDeleteTable}
							onAddFloor={handleAddFloor}
							onDeleteFloor={handleDeleteFloor}
						/>
					)}
					{activePage === 'settings' && (
						<SettingsPage
							tables={tables}
							floors={floors}
						/>
					)}
				</main>
			</div>

			{/* Backend Connection Status Banner */}
			{!isConnected && initialLoadDone && (
				<div className='fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 text-center py-2 px-4 z-40 flex items-center justify-center gap-3'>
					<span className='font-medium'>
						⚠️ Koneksi ke server terputus. Mencoba menghubungkan kembali...
					</span>
					<button
						onClick={retry}
						disabled={isChecking}
						className='bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50'>
						{isChecking ? 'Memeriksa...' : 'Coba Lagi'}
					</button>
				</div>
			)}

			{/* Initial Loading - Waiting for Backend */}
			{!initialLoadDone && (
				<div className='fixed inset-0 bg-primary flex items-center justify-center z-50'>
					<div className='bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[280px]'>
						<div className='w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin'></div>
						<div className='text-center'>
							<p className='text-primary font-semibold text-lg'>
								{isChecking ? 'Menghubungkan ke server...' : 'Memuat data...'}
							</p>
							<p className='text-gray-500 text-sm mt-1'>
								{isConnected
									? 'Mengambil data dari database'
									: 'Menunggu koneksi backend'}
							</p>
						</div>
						{!isConnected && !isChecking && (
							<button
								onClick={retry}
								className='mt-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium'>
								Coba Lagi
							</button>
						)}
					</div>
				</div>
			)}

			{/* Global Loading Overlay */}
			{isLoading && (
				<div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50'>
					<div className='bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 min-w-[200px]'>
						<div className='w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin'></div>
						<p className='text-primary font-semibold text-center'>
							{loadingMessage || 'Memproses...'}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
