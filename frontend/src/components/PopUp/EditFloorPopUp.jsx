import React from 'react';

const EditFloorModal = ({
	isOpen,
	onClose,
	floors,
	onAddFloor,
	onDeleteFloor,
}) => {
	if (!isOpen) return null;

	const handleAddFloor = () => {
		const existingFloorNums = floors.map((f) =>
			typeof f === 'object' ? f.number : f
		);

		const nextFloorNum =
			existingFloorNums.length > 0 ? Math.max(...existingFloorNums) + 1 : 1;

		if (nextFloorNum <= 0) {
			alert('⚠️ Nomor lantai harus lebih dari 0');
			return;
		}

		if (existingFloorNums.includes(nextFloorNum)) {
			alert('⚠️ Lantai sudah ada');
			return;
		}

		onAddFloor(nextFloorNum);
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
				className='bg-primary rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl'
				onClick={(e) => e.stopPropagation()}>
				<div className='flex items-center justify-between mb-6'>
					<h3 className='text-2xl font-bold text-secondary'>🏢 Edit Lantai</h3>
					<button
						onClick={onClose}
						className='text-secondary hover:text-secondary-dark text-2xl'>
						×
					</button>
				</div>

				{/* List of Floors */}
				<div className='mb-6'>
					<h4 className='text-lg font-semibold text-secondary mb-3'>
						Daftar Lantai
					</h4>
					<div className='space-y-2 max-h-60 overflow-y-auto'>
						{floors.length === 0 ? (
							<p className='text-gray-500 text-center py-4'>Belum ada lantai</p>
						) : (
							floors.map((floor) => (
								<div
									key={typeof floor === 'object' ? floor.id : floor}
									className='flex items-center justify-between p-3 bg-white rounded-lg border border-secondary'>
									<span className='font-semibold text-primary'>
										Lantai {typeof floor === 'object' ? floor.number : floor}
									</span>
									<button
										onClick={() =>
											handleDeleteFloor(
												typeof floor === 'object' ? floor.number : floor
											)
										}
										className='px-3 py-1 bg-danger hover:bg-danger-dark text-white rounded-lg font-semibold transition-all duration-200 active:scale-95'>
										🗑️
									</button>
								</div>
							))
						)}
					</div>
				</div>

				{/* Add Floor */}
				<div className='mb-2'>
					<h4 className='text-lg font-semibold text-secondary mb-3'>
						Tambah Lantai Baru
					</h4>
					<div className='flex'>
						<button
						onClick={handleAddFloor}
						className='flex-1 px-4 py-2 bg-secondary hover:bg-secondary-dark text-primary rounded-xl font-semibold transition-all duration-200 active:scale-95'>
						Tambah
					</button>
					</div>
					
				</div>
			</div>
		</div>
	);
};

export default EditFloorModal;
