import React from 'react';

const EditTableModal = ({
	isOpen,
	onClose,
	table,
	tableNumber,
	tableCapacity,
	onTableNumberChange,
	onTableCapacityChange,
	onConfirm,
}) => {
	if (!isOpen || !table) return null;

	return (
		<div
			className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
			onClick={onClose}>
			<div
				className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4'
				onClick={(e) => e.stopPropagation()}>
				<div className='flex items-center justify-between mb-4'>
					<h3 className='text-2xl font-bold text-primary'>✏️ Edit Meja</h3>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-gray-600 text-2xl'>
						×
					</button>
				</div>

				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-semibold text-primary mb-2'>
							Nomor Meja <span className='text-danger'>*</span>
						</label>
						<input
							type='number'
							value={tableNumber}
							onChange={(e) => onTableNumberChange(e.target.value)}
							placeholder='Nomor meja'
							min='1'
							className='w-full px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40'
							autoFocus
						/>
					</div>

					<div>
						<label className='block text-sm font-semibold text-primary mb-2'>
							Kapasitas <span className='text-danger'>*</span>
						</label>
						<input
							type='number'
							value={tableCapacity}
							onChange={(e) => onTableCapacityChange(e.target.value)}
							placeholder='Jumlah kursi'
							min='1'
							className='w-full px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40'
						/>
					</div>

					<div className='p-3 bg-gray-100 rounded-xl'>
						<p className='text-sm text-gray-600'>
							<strong>Lantai:</strong> {table.floor}
						</p>
						<p className='text-xs text-gray-500 mt-1'>
							💡 Lantai tidak dapat diubah
						</p>
					</div>
				</div>

				<div className='flex gap-3 mt-6'>
					<button
						onClick={onClose}
						className='flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all active:scale-95'>
						Batal
					</button>
					<button
						onClick={onConfirm}
						className='flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-all active:scale-95'>
						Simpan
					</button>
				</div>
			</div>
		</div>
	);
};

export default EditTableModal;
