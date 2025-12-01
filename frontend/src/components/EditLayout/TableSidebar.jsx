import React from 'react';
import { FilterIcon } from 'lucide-react';

const TableSidebar = ({
	displayedTables,
	selectedTable,
	searchQuery,
	filterCapacity,
	filterFloor,
	onSearchChange,
	onFilterClick,
	onTableSelect,
	onEditTable,
}) => {
	const handleTableClick = (table) => {
		// Toggle selection: if already selected, deselect it
		if (selectedTable?.id === table.id) {
			onTableSelect(null);
		} else {
			onTableSelect(table);
		}
	};
	return (
		<div className='w-full lg:w-80 bg-secondary rounded-2xl shadow-lg overflow-hidden'>
			<div className='p-4 bg-primary text-secondary-light flex items-center justify-between font-bold'>
				<h3 className='text-lg'>📋 Daftar Meja ({displayedTables.length})</h3>

				<div className='text-lg mr-3'>Lt.{filterFloor}</div>
			</div>

			{/* Search and Filter Section */}
			<div className='p-4 space-y-2 border-b border-primary/20'>
				<div className='flex gap-2'>
					<div className='relative flex-1'>
						<input
							type='text'
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder='🔍 Cari nama meja...'
							className='w-full bg-white hover:bg-primary/40 px-4 py-2 pr-8 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm'
						/>
						{searchQuery && (
							<button
								onClick={() => onSearchChange('')}
								className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'>
								✕
							</button>
						)}
					</div>
					<button
						onClick={onFilterClick}
						className='px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95 border-2 border-primary/30 text-primary hover:bg-primary/20'>
						<FilterIcon className='w-4 h-4 inline-block' />
					</button>
				</div>
			</div>

			<div className='p-4 space-y-2 h-[460px] border-b border-primary/20 overflow-y-auto'>
				{displayedTables.length > 0 ? (
					displayedTables.map((table) => (
						<div
							key={table.id}
							onClick={() => handleTableClick(table)}
							className={`relative px-4 py-3 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
								selectedTable?.id === table.id
									? 'border-primary bg-primary text-secondary shadow-lg'
									: 'border-primary/30 hover:border-primary hover:bg-primary/10 shadow-md hover:scale-105 overflow-hidden'
							}`}>
							{selectedTable?.id !== table.id && (
								<div className='shine-animation'></div>
							)}
							<div>
								<div className='flex items-center gap-3'>
									<div className='flex-1'>
										<div className='flex flex-row items-center gap-2'>
											<h4
												className={`font-bold text-base flex-1 ${
													selectedTable?.id === table.id
														? 'text-secondary'
														: 'text-primary'
												}`}>
												{table.name}
											</h4>

											{selectedTable?.id === table.id && (
												<>
													<button
														onClick={(e) => {
															e.stopPropagation();
															onEditTable(table);
														}}
														className='px-3 py-1.5 bg-secondary hover:bg-secondary-dark text-primary rounded-lg text-xs font-bold transition-all active:scale-95'>
														✏️
													</button>
												</>
											)}
										</div>

										<p
											className={`text-xs mt-1 ${
												selectedTable?.id === table.id
													? 'text-white/80'
													: 'text-gray-500'
											}`}>
											Kapasitas: {table.capacity} | Lantai {table.floor}
										</p>

										{table.coords && (
											<p
												className={`text-xs ${
													selectedTable?.id === table.id
														? 'text-white/60'
														: 'text-gray-400'
												}`}>
												📍 ({Math.round(table.coords[0])},{' '}
												{Math.round(table.coords[1])}) → (
												{Math.round(table.coords[2])},{' '}
												{Math.round(table.coords[3])})
												<br />
												📐{' '}
												{Math.round(
													Math.abs(table.coords[2] - table.coords[0])
												)}
												×
												{Math.round(
													Math.abs(table.coords[3] - table.coords[1])
												)}{' '}
												px
												{table.rotation !== undefined &&
													table.rotation !== 0 && (
														<>
															<br />
															🔄 Rotasi:{' '}
															{Math.round((table.rotation * 180) / Math.PI)}°
														</>
													)}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					))
				) : (
					<div className='items-center flex flex-col justify-center h-[90%]'>
						<div className='text-5xl mb-3 opacity-30'>🪑</div>
						<p className='text-gray-500'>
							{searchQuery || filterCapacity || filterFloor
								? 'Tidak ada meja yang sesuai'
								: 'Belum ada meja'}
						</p>
						<p className='text-xs text-gray-400 mt-2'>
							{searchQuery || filterCapacity || filterFloor
								? 'Coba ubah filter atau pencarian'
								: 'Klik "Tambah Meja" atau draw di canvas'}
						</p>
					</div>
				)}
			</div>
			<div className='bg-primary h-full' />
		</div>
	);
};

export default TableSidebar;
