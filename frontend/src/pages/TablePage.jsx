import React, { useMemo, useState, useEffect } from 'react';
import SummaryCards from '../components/SummaryCards';
import CctvPanel from '../components/CctvPanel';
import TableFilter from '../components/TableFilter';
import TableCard from '../components/TableCard';

const TablePage = ({ tables, onStatusChange }) => {
	const [activeFilter, setActiveFilter] = useState('all');
	const [selectedFloor, setSelectedFloor] = useState('all'); // untuk filter tabel
	const [cctvSelectedFloor, setCctvSelectedFloor] = useState('1'); // khusus CCTV, default lantai 1

	// Load CCTV feeds dari localStorage
	const [cctvFeeds, setCctvFeeds] = useState({ 1: [], 2: [], 3: [] });

	useEffect(() => {
		try {
			const stored = localStorage.getItem('freespot_cctv_settings');
			if (stored) {
				const parsed = JSON.parse(stored);
				setCctvFeeds(parsed);
			}
		} catch (error) {
			console.error('Error loading CCTV settings:', error);
		}
	}, []);

	// Get unique floors from tables
	const floors = useMemo(() => {
		return [
			...new Set(tables.map((t) => t.floor).filter((f) => f !== undefined)),
		].sort((a, b) => a - b);
	}, [tables]);

	// Dynamic floor options untuk CCTV (hanya lantai yang ada)
	const cctvFloorOptions = useMemo(() => {
		return floors.map((floor) => ({
			value: floor.toString(),
			label: `Lantai ${floor}`,
		}));
	}, [floors]);

	// Set default CCTV floor jika belum ada
	useEffect(() => {
		if (floors.length > 0 && !floors.includes(parseInt(cctvSelectedFloor))) {
			setCctvSelectedFloor(floors[0].toString());
		}
	}, [floors]);

	// Filter tables by status and floor
	let filteredTables = tables;

	if (activeFilter !== 'all') {
		filteredTables = filteredTables.filter((t) => t.status === activeFilter);
	}

	if (selectedFloor !== 'all') {
		filteredTables = filteredTables.filter(
			(t) => t.floor === parseInt(selectedFloor)
		);
	}

	const cctvFeedsByFloor = cctvFeeds;

	return (
		<div>
			{/* CCTV di atas summary */}
			<CctvPanel
				feedsByFloor={cctvFeedsByFloor}
				floorOptions={cctvFloorOptions}
				floorValue={cctvSelectedFloor}
				onFloorChange={setCctvSelectedFloor}
				onRefresh={() => {
					// Reload feeds dari localStorage
					try {
						const stored = localStorage.getItem('freespot_cctv_settings');
						if (stored) {
							setCctvFeeds(JSON.parse(stored));
						}
					} catch (error) {
						console.error('Error reloading CCTV settings:', error);
					}
				}}
			/>
			<SummaryCards tables={tables} />

			<div>
				<h2 className='text-2xl font-bold text-primary mb-4'>Status Meja</h2>
				<TableFilter
					activeFilter={activeFilter}
					setActiveFilter={setActiveFilter}
					selectedFloor={selectedFloor}
					setSelectedFloor={setSelectedFloor}
					tables={tables}
				/>

				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
					{filteredTables.length > 0 ? (
						filteredTables.map((table) => (
							<TableCard
								key={table.id}
								table={table}
								onStatusChange={onStatusChange}
							/>
						))
					) : (
						<div className='col-span-full flex items-center justify-center py-16'>
							<div className='text-center'>
								<div className='text-6xl mb-4 opacity-50'>📋</div>
								<p className='text-gray-500 text-lg'>
									Tidak ada meja yang sesuai dengan filter
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default TablePage;
