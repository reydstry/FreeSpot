import React, { useState } from 'react';

const EditFloorModal = ({
	isOpen,
	onClose,
	floors,
	onAddFloor,
	onDeleteFloor,
}) => {
	const [newFloorNumber, setNewFloorNumber] = useState('');

	if (!isOpen) return null;

	const handleAddFloor = () => {
		if (!newFloorNumber || isNaN(newFloorNumber)) {
			alert('⚠️ Masukkan nomor lantai yang valid');
			return;
		}

		const floorNum = parseInt(newFloorNumber);
		if (floorNum <= 0) {
			alert('⚠️ Nomor lantai harus lebih dari 0');
			return;
		}

		if (floors.includes(floorNum)) {
			alert('⚠️ Lantai sudah ada');
			return;
		}

		onAddFloor(floorNum);
		setNewFloorNumber('');
	};

	const handleDeleteFloor = (floorNum) => {
		if (
			confirm(
				`Hapus Lantai ${floorNum}? Semua meja di lantai ini akan ikut terhapus.`
			)
		) {
			onDeleteFloor(floorNum);
		}
	};

	return (
		<div
			className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
			onClick={onClose}>
			<div
				className='bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl'
				onClick={(e) => e.stopPropagation()}>
				<div className='flex items-center justify-between mb-6'>
					<h3 className='text-2xl font-bold text-primary'>🏢 Edit Lantai</h3>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-gray-600 text-2xl'>
						×
					</button>
				</div>

				{/* List of Floors */}
				<div className='mb-6'>
					<h4 className='text-lg font-semibold text-primary mb-3'>
						Daftar Lantai
					</h4>
					<div className='space-y-2 max-h-60 overflow-y-auto'>
						{floors.length === 0 ? (
							<p className='text-gray-500 text-center py-4'>Belum ada lantai</p>
						) : (
							floors.map((floor) => (
								<div
									key={floor}
									className='flex items-center justify-between p-3 bg-secondary-light rounded-lg border border-secondary'>
									<span className='font-semibold text-primary'>
										Lantai {floor}
									</span>
									<button
										onClick={() => handleDeleteFloor(floor)}
										className='px-3 py-1 bg-danger hover:bg-danger-dark text-white rounded-lg font-semibold transition-all duration-200 active:scale-95'>
										🗑️ Hapus
									</button>
								</div>
							))
						)}
					</div>
				</div>

				{/* Add Floor */}
				<div className='mb-6'>
					<h4 className='text-lg font-semibold text-primary mb-3'>
						Tambah Lantai Baru
					</h4>
					<div className='flex gap-2'>
						<input
							type='number'
							value={newFloorNumber}
							onChange={(e) => setNewFloorNumber(e.target.value)}
							placeholder='No. Lantai'
							className='flex-1 px-4 py-2 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40'
						/>
						<button
							onClick={handleAddFloor}
							className='px-4 py-2 bg-success hover:bg-success-dark text-white rounded-xl font-semibold transition-all duration-200 active:scale-95'>
							➕ Tambah
						</button>
					</div>
				</div>

				{/* Action Buttons */}
				<div className='flex gap-3'>
					<button
						onClick={onClose}
						className='flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all active:scale-95'>
						Tutup
					</button>
				</div>
			</div>
		</div>
	);
};

export default EditFloorModal;
