import React from 'react';
import CustomDropdown from './CustomDropdown';

const TableFilter = ({
	activeFilter,
	setActiveFilter,
	selectedFloor,
	setSelectedFloor,
	tables,
	floors = [],
}) => {
	const filters = [
		{ id: 'all', label: 'Semua Meja' },
		{
			id: 'tersedia',
			label: 'Tersedia',
			matchStatus: ['tersedia', 'available'],
		},
		{
			id: 'terpakai',
			label: 'Terpakai',
			matchStatus: ['terpakai', 'occupied'],
		},
		{
			id: 'reservasi',
			label: 'Direservasi',
			matchStatus: ['reservasi', 'reserved'],
		},
	];

	// Get floors from database (props) or fallback to unique floors from tables
	const availableFloors =
		floors && floors.length > 0
			? floors.map((f) => f.number).sort((a, b) => a - b)
			: [...new Set(tables.map((t) => t.floor))].sort((a, b) => a - b);

	const floorOptions = [
		{ value: 'all', label: 'Semua Lantai' },
		...availableFloors.map((floor) => ({
			value: floor.toString(),
			label: `Lantai ${floor}`,
		})),
	];

	return (
		<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6'>
			<div className='flex flex-wrap gap-4'>
				{filters.map((filter) => (
					<button
						key={filter.id}
						onClick={() => setActiveFilter(filter.id)}
						className={`
							px-4 py-1.5 rounded-full font-bold 
							transition-all duration-700 ease-out
							shadow-md hover:shadow-xl hover:scale-110 hover:-translate-y-1 active:scale-95
							relative overflow-hidden
							border border-transparent
							${
								activeFilter === filter.id
									? 'bg-primary  text-secondary scale-105 shadow-xl backdrop-blur-xl border border-white/20'
									: 'bg-linear-to-br from-secondary-light to-secondary/15 text-primary hover:from-secondary/30 hover:to-secondary-light '
							}
						`}>
						{activeFilter !== filter.id && (
							<div className='shine-animation'></div>
						)}
						{filter.label}
					</button>
				))}
			</div>

			<CustomDropdown
				value={selectedFloor}
				onChange={(value) => setSelectedFloor(value)}
				options={floorOptions}
				label='Pilih Lantai'
			/>
		</div>
	);
};

export default TableFilter;
