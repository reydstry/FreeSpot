import React from 'react';

const SummaryCards = ({ tables }) => {
	// Support both old (tersedia/terpakai/reservasi) and new (available/occupied/reserved) status
	const tersedia = tables.filter(
		(t) => t.status === 'tersedia' || t.status === 'available'
	).length;
	const terpakai = tables.filter(
		(t) => t.status === 'terpakai' || t.status === 'occupied'
	).length;
	const direservasi = tables.filter(
		(t) => t.status === 'reservasi' || t.status === 'reserved'
	).length;

	const cards = [
		{
			label: 'Tersedia',
			count: tersedia,
			colorClass: 'from-success-light to-success-dark',
			subtitle: 'Meja siap dipakai',
		},
		{
			label: 'Terpakai',
			count: terpakai,
			colorClass: 'from-danger-light to-danger-dark',
			subtitle: 'Meja Dipakai',
		},
		{
			label: 'Direservasi',
			count: direservasi,
			colorClass: 'from-warning-light to-warning-dark',
			subtitle: 'Meja sudah direservasi',
		},
	];

	return (
		<div className='mb-6'>
			<h2 className='text-2xl font-bold text-primary mb-4'>Ringkasan Meja</h2>
			<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
				{cards.map((card) => (
					<div
						key={card.label}
						className={` bg-linear-to-br ${card.colorClass}
							backdrop-blur-xl bg-white/10
							border border-white/20
							text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl
							relative overflow-hidden
							transition-all duration-300
							shine-effect`}>
						<div className='shine-animation'></div>
						<div className='flex items-center gap-2 mb-3'>
							<div className='w-3 h-3 rounded-full bg-white/30'></div>
							<span className='font-bold text-lg'>{card.label}</span>
						</div>
						<div className='text-5xl font-extrabold mb-2'>{card.count}</div>
						<div className='text-sm opacity-90'>{card.subtitle}</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default SummaryCards;
