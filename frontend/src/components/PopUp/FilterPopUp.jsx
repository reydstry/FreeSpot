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
	isLoading = false,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
			onClick={onClose}>
			<div
				className='bg-primary rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4'
				onClick={(e) => e.stopPropagation()}>
				<div className='flex items-center justify-between mb-4'>
					<h3 className='text-2xl font-bold text-secondary'>🔎 Filter Meja</h3>
					<button
						onClick={onClose}
						className='text-secondary hover:text-secondary-dark text-2xl'>
						×
					</button>
				</div>

				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-semibold text-secondary mb-2'>
							Kapasitas
						</label>
						<input
							type='number'
							value={filterCapacity}
							onChange={(e) => onFilterCapacityChange(e.target.value)}
							placeholder='Cari berdasarkan kapasitas...'
							className='w-full px-4 py-2 border-2 bg-white	 text-primary-dark border-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
						/>
					</div>

					<div>
						<label className='block text-sm font-semibold text-secondary mb-2'>
							Lantai
						</label>
						<div className='relative'>
							<select
								value={filterFloor}
								onChange={(e) => onFilterFloorChange(e.target.value)}
								className='w-full px-4 py-2 pr-10 border-2 bg-white text-primary border-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/40 appearance-none cursor-pointer'>
								{floors.map((floor) => (
									<option
										key={floor}
										value={floor}>
										Lantai {floor}
									</option>
								))}
							</select>
							<div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
								<svg
									className='w-5 h-5 text-primary'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M19 9l-7 7-7-7'
									/>
								</svg>
							</div>
						</div>
					</div>

					<div>
						<label className='block text-sm font-semibold text-secondary mb-2'>
							Urutkan Berdasarkan
						</label>
						<div className='relative'>
							<select
								value={sortOrder}
								onChange={(e) => onSortOrderChange(e.target.value)}
								className='w-full px-4 py-2 pr-10 border-2 bg-white text-primary border-secondary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/40 appearance-none cursor-pointer'>
								<option value='none'>Default (Lantai)</option>
								<option value='asc'>Nomor Meja: Kecil ke Besar</option>
								<option value='desc'>Nomor Meja: Besar ke Kecil</option>
							</select>
							<div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
								<svg
									className='w-5 h-5 text-primary'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M19 9l-7 7-7-7'
									/>
								</svg>
							</div>
						</div>
					</div>
				</div>

				<div className='flex gap-3 mt-6'>
					<button
						onClick={onReset}
						className='flex-1 px-4 py-2.5 bg-secondary hover:bg-secondary-dark text-gray-700 rounded-xl font-semibold transition-all active:scale-95'>
						Reset
					</button>
					<button
						onClick={onApply}
						className='flex-1 px-4 py-2.5 bg-primary-light hover:bg-black text-secondary rounded-xl font-semibold transition-all active:scale-95'>
						Terapkan
					</button>
				</div>
			</div>
		</div>
	);
};

export default FilterModal;
