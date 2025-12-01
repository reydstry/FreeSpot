import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TablePage from './pages/TablePage';
import EditLayoutPage from './pages/EditLayoutPage';
import SettingsPage from './pages/SettingsPage';
import { tablesAPI, floorsAPI } from './services/api';

export default function App() {
	const [activePage, setActivePage] = useState('meja');
	const [tables, setTables] = useState([]);
	const [floors, setFloors] = useState([]);
	const [isMinimized, setIsMinimized] = useState(false);
	const [isBackendAvailable, setIsBackendAvailable] = useState(false);

	// Load floors dari DB
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

	// Load tables: ambil dari backend; kalau gagal, tampilkan kosong
	useEffect(() => {
		let cancelled = false;

		const loadTables = async () => {
			try {
				const data = await tablesAPI.getAll();
				if (!cancelled && data && Array.isArray(data)) {
					setTables(
						data.map((t) => {
							// Map floor_id ke floor.number dari floors array
							const floorObj = floors.find((f) => f.id === t.floor_id);
							return {
								id: t.id,
								name: t.name,
								floor: floorObj
									? floorObj.number
									: (t.floor_id ?? t.floor ?? 1),
								capacity: t.capacity,
								status: t.status || 'available',
								coords: t.coords,
								width: t.width,
								height: t.height,
								rotation: t.rotation ?? 0.0,
							};
						})
					);
					setIsBackendAvailable(true);
					return;
				}
			} catch (error) {
				console.warn(
					'Backend tables fetch failed, fallback to local data:',
					error
				);
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

	// (Optional) jika ingin simpan ke localStorage lagi,
	// definisikan STORAGE_KEY di atas dan aktifkan kembali blok ini.

	const handleStatusChange = (id, newStatus, skipApiUpdate = false) => {
		setTables((prev) =>
			prev.map((table) =>
				table.id === id ? { ...table, status: newStatus } : table
			)
		);

		// Optional: kalau backend tersedia dan bukan dari detection (skip API update jika dari detection karena DB sudah diupdate)
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
	};

	const handleSaveTables = (newTables) => {
		setTables(newTables);

		// Sinkronkan seluruh layout ke backend jika tersedia
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
	};

	const handleAddTable = async (tableData) => {
		console.log('🔵 handleAddTable called with:', tableData);

		if (isBackendAvailable) {
			try {
				// Jika floor_id sudah ada (dari fresh floor creation), gunakan langsung
				let floorId = tableData.floor_id;

				// Jika tidak ada, map dari floor number
				if (!floorId) {
					const floorNum = tableData.floor || tableData.floorId || 1;
					const floorObj = floors.find((f) => f.number === floorNum);

					if (floorObj) {
						floorId = floorObj.id;
						console.log(`✅ Found floor ${floorNum} with ID ${floorId}`);
					} else {
						// Floor belum di cache, coba fetch atau gunakan floorNum sebagai fallback
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
					status: tableData.status || 'available',
					rotation: tableData.rotation ?? 0.0,
				};

				console.log('📤 Sending to backend:', payload);
				const created = await tablesAPI.create(payload);
				console.log('📥 Backend response:', created);

				// Map floor_id kembali ke floor.number
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
				throw error; // Throw error agar caller bisa handle
			}
		} else {
			console.warn('⚠️ Backend not available, using local fallback');
			// Fallback lokal (kalau backend down)
			const newId =
				tables.length > 0 ? Math.max(...tables.map((t) => t.id)) + 1 : 1;
			const newTable = {
				id: newId,
				...tableData,
				status: tableData.status || 'available',
			};
			setTables((prev) => [...prev, newTable]);
			return newTable;
		}
	};

	const handleUpdateTable = async (id, updates) => {
		setTables((prev) =>
			prev.map((table) => (table.id === id ? { ...table, ...updates } : table))
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
	};

	const handleDeleteTable = (id) => {
		// Validasi: minimal harus ada 1 meja
		if (tables.length <= 1) {
			alert('❌ Tidak bisa menghapus! Minimal harus ada 1 meja.');
			return;
		}

		setTables((prev) => prev.filter((table) => table.id !== id));

		if (isBackendAvailable) {
			tablesAPI.delete(id).catch(() => {});
		}
	};

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
							onAddFloor={async (floorData) => {
								try {
									const created = await floorsAPI.create(floorData);
									setFloors((prev) => [...prev, created]);
									return created;
								} catch (error) {
									console.error('Failed to create floor:', error);
									throw error;
								}
							}}
							onDeleteFloor={async (floorId) => {
								try {
									await floorsAPI.delete(floorId);
									setFloors((prev) => prev.filter((f) => f.id !== floorId));
								} catch (error) {
									console.error('Failed to delete floor:', error);
									throw error;
								}
							}}
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
		</div>
	);
}
