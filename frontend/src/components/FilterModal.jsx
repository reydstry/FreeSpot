import React from 'react';

const FilterModal = ({
	isOpen,
	onClose,
	filterCapacity,
	filterFloor,
	sortOrder,
	floors,
	onFilterCapacityChange,
	onFilterFloorChange,
	onSortOrderChange,
	onReset,
	onApply,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
			onClick={onClose}>
			<div
				className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4'
				onClick={(e) => e.stopPropagation()}>
				<div className='flex items-center justify-between mb-4'>
					<h3 className='text-2xl font-bold text-primary'>🔎 Filter Meja</h3>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-gray-600 text-2xl'>
						×
					</button>
				</div>

				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-semibold text-primary mb-2'>
							Kapasitas
						</label>
						<input
							type='number'
							value={filterCapacity}
							onChange={(e) => onFilterCapacityChange(e.target.value)}
							placeholder='Cari berdasarkan kapasitas...'
							className='w-full px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40'
						/>
					</div>

					<div>
						<label className='block text-sm font-semibold text-primary mb-2'>
							Lantai
						</label>
						<select
							value={filterFloor}
							onChange={(e) => onFilterFloorChange(e.target.value)}
							className='w-full px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40'>
							{floors.map((floor) => (
								<option
									key={floor}
									value={floor}>
									Lantai {floor}
								</option>
							))}
						</select>
					</div>

					<div>
							<div>
								<label className='block text-sm font-semibold text-primary mb-2'>
									Urutkan Berdasarkan Nomor Meja
								</label>
								<select
									value={sortOrder}
									onChange={(e) => onSortOrderChange(e.target.value)}
									className='w-full px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40'>
									<option value='none'>Tanpa Urutan (Default: Lantai)</option>
									<option value='asc'>Nomor Terkecil ke Terbesar</option>
									<option value='desc'>Nomor Terbesar ke Terkecil</option>
								</select>
							</div>
					</div>
				</div>

				<div className='flex gap-3 mt-6'>
					<button
						onClick={onReset}
						className='flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all active:scale-95'>
						Reset
					</button>
					<button
						onClick={onApply}
						className='flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-all active:scale-95'>
						Terapkan
					</button>
				</div>
			</div>
		</div>
	);
};

export default FilterModal;
