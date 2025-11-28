import React from 'react';

const AddTableModal = ({
	isOpen,
	onClose,
	tableNumber,
	tableCapacity,
	tableFloor,
	floors,
	onTableNumberChange,
	onTableCapacityChange,
	onTableFloorChange,
	onConfirm,
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
					<h3 className='text-2xl font-bold text-secondary'>➕ Tambah Meja</h3>
					<button
						onClick={onClose}
						className='text-secondary hover:text-secondary-dark text-2xl'>
						×
					</button>
				</div>

				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-semibold text-secondary mb-2'>
							Nomor Meja <span className='text-danger'>*</span>
						</label>
						<input
							type='number'
							value={tableNumber}
							onChange={(e) => onTableNumberChange(e.target.value)}
							placeholder='Contoh: 1, 2, 3'
							min='1'
							className='w-full bg-white px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
							autoFocus
						/>
					</div>

					<div>
						<label className='block text-sm font-semibold text-secondary mb-2'>
							Kapasitas <span className='text-danger'>*</span>
						</label>
						<input
							type='number'
							value={tableCapacity}
							onChange={(e) => onTableCapacityChange(e.target.value)}
							placeholder='Jumlah kursi'
							min='1'
							className='w-full bg-white px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
						/>
					</div>

					<div className='relative'>
						<label className='block text-sm font-semibold text-secondary mb-2'>
							Lantai <span className='text-danger'>*</span>
						</label>
						<select
							value={tableFloor}
							onChange={(e) => onTableFloorChange(e.target.value)}
							className='w-full bg-white px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 appearance-none cursor-pointer focus:ring-primary/40'>
							{floors.length > 0 ? (
								floors.map((floor) => (
									<option
										key={floor}
										value={floor}>
										Lantai {floor}
									</option>
								))
							) : (
								<option value='1'>Lantai 1</option>
							)}
						</select>
						<div className='absolute inset-y-13 right-0 flex items-center pr-3 pointer-events-none'>
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
						{floors.length === 0 && (
							<p className='text-xs text-secondary-light mt-1'>
								💡 Lantai 1 akan dibuat otomatis
							</p>
						)}
					</div>
				</div>

				<div className='flex gap-3 mt-6'>
					<button
						onClick={onClose}
						className='flex-1 px-4 py-2.5 bg-secondary hover:bg-secondary-dark text-primary rounded-xl font-semibold transition-all active:scale-95'>
						Batal
					</button>
					<button
						onClick={onConfirm}
						className='flex-1 px-4 py-2.5 bg-primary-light hover:bg-primary-dark text-secondary rounded-xl font-semibold transition-all active:scale-95'>
						Tambah
					</button>
				</div>
			</div>
		</div>
	);
};

export default AddTableModal;
