import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TablePage from './pages/TablePage';
import EditLayoutPage from './pages/EditLayoutPage';
import SettingsPage from './pages/SettingsPage';
import { initialTables } from './data/initialData';
import { tablesAPI } from './services/api';

const STORAGE_KEY = 'freespot_tables';

export default function App() {
	const [activePage, setActivePage] = useState('meja');
	const [tables, setTables] = useState([]);
	const [isMinimized, setIsMinimized] = useState(false);
	const [isBackendAvailable, setIsBackendAvailable] = useState(false);

	// Load tables: coba ambil dari backend dulu, fallback ke localStorage/initialData
	useEffect(() => {
		let cancelled = false;

		const loadTables = async () => {
			try {
				const data = await tablesAPI.getAll();
				if (!cancelled && data && Array.isArray(data.tables)) {
					setTables(
						data.tables.map((t) => ({
							id: t.id,
							name: t.name,
							floor: t.floor,
							capacity: t.capacity,
							status: t.status || (t.occupied ? 'terpakai' : 'tersedia'),
						}))
					);
					setIsBackendAvailable(true);
					return;
				}
			} catch (error) {
				console.warn('Backend tables fetch failed, fallback to local data:', error);
			}

			// Fallback ke localStorage / initialTables
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (!cancelled) {
					if (stored) {
						const parsed = JSON.parse(stored);
						setTables(parsed);
					} else {
						setTables(initialTables);
						localStorage.setItem(STORAGE_KEY, JSON.stringify(initialTables));
					}
				}
			} catch (error) {
				console.error('Error loading tables from local storage:', error);
				if (!cancelled) {
					setTables(initialTables);
				}
			}
		};

		loadTables();

		return () => {
			cancelled = true;
		};
	}, []);

	// Simpan ke localStorage untuk offline / fallback
	useEffect(() => {
		if (tables.length > 0) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
		}
	}, [tables]);

	const handleStatusChange = (id, newStatus) => {
		setTables((prev) =>
			prev.map((table) =>
				table.id === id ? { ...table, status: newStatus } : table
			)
		);

		// Optional: kalau backend tersedia, update status juga ke server
		if (isBackendAvailable) {
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
		// Kalau backend tersedia, buat di backend dulu supaya id konsisten dengan DB
		if (isBackendAvailable) {
			try {
				const payload = {
					name: tableData.name,
					capacity: tableData.capacity,
					floor_id: tableData.floorId || tableData.floor_id || 1,
					coords: tableData.coords || [0, 0, 0, 0],
					status: tableData.status || 'tersedia',
				};
				const created = await tablesAPI.create(payload);
				const newTable = {
					id: created.id,
					name: created.name,
					floor: created.floor,
					capacity: created.capacity,
					status: created.status,
				};
				setTables((prev) => [...prev, newTable]);
				return newTable;
			} catch (error) {
				console.warn('Failed to create table on backend, fallback to local:', error);
			}
		}

		// Fallback lokal
		const newId =
			tables.length > 0 ? Math.max(...tables.map((t) => t.id)) + 1 : 1;
		const newTable = { id: newId, ...tableData };
		setTables((prev) => [...prev, newTable]);
		return newTable;
	};

	const handleUpdateTable = (id, updates) => {
		setTables((prev) =>
			prev.map((table) => (table.id === id ? { ...table, ...updates } : table))
		);

		if (isBackendAvailable) {
			const table = tables.find((t) => t.id === id);
			if (table) {
				tablesAPI
					.update(id, {
						name: updates.name ?? table.name,
						capacity: updates.capacity ?? table.capacity,
						status: updates.status ?? table.status,
					})
					.catch(() => {});
			}
		}
	};

	const handleDeleteTable = (id) => {
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
							onStatusChange={handleStatusChange}
						/>
					)}
					{activePage === 'edit' && (
						<EditLayoutPage
							tables={tables}
							onSaveTables={handleSaveTables}
							onAddTable={handleAddTable}
							onUpdateTable={handleUpdateTable}
							onDeleteTable={handleDeleteTable}
						/>
					)}
					{activePage === 'report' && <ReportPage tables={tables} />}
					{activePage === 'settings' && <SettingsPage tables={tables} />}
				</main>
			</div>
		</div>
	);
}
