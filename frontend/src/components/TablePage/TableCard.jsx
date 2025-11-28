import React from 'react';
import TableImg from '../../assets/meja.png';
import kapasitasIcon from '../../assets/kapasitas.png';
import lokasiIcon from '../../assets/lokasi.png';

const TableCard = ({ table, onStatusChange }) => {
	const statusConfig = {
		available: {
			bgColor: 'bg-success/40',
			textColor: 'text-success-light',
			hovertextColor: 'hover:text-success-dark-2',
			borderColor: 'border-success-light/30',
			hoverBg: 'hover:bg-success-dark',
			label: 'Tersedia',
			subtitle: 'Meja siap dipakai',
		},
		tersedia: {
			bgColor: 'bg-success/40',
			textColor: 'text-success-light',
			hovertextColor: 'hover:text-success-dark-2',
			borderColor: 'border-success-light/30',
			hoverBg: 'hover:bg-success-dark',
			label: 'Tersedia',
			subtitle: 'Meja siap dipakai',
		},

		occupied: {
			bgColor: 'bg-danger/40',
			textColor: 'text-danger-light',
			hovertextColor: 'hover:text-danger-dark-2',
			borderColor: 'border-danger-light/30',
			hoverBg: 'hover:bg-danger-dark',
			label: 'Terpakai',
			subtitle: 'Meja Dipakai',
		},
		terpakai: {
			bgColor: 'bg-danger/40',
			textColor: 'text-danger-light',
			hovertextColor: 'hover:text-danger-dark-2',
			borderColor: 'border-danger-light/30',
			hoverBg: 'hover:bg-danger-dark',
			label: 'Terpakai',
			subtitle: 'Meja Dipakai',
		},

		reserved: {
			bgColor: 'bg-warning/40',
			textColor: 'text-warning-light',
			hovertextColor: 'hover:text-warning-dark-2',
			borderColor: 'border-warning-light/30',
			hoverBg: 'hover:bg-warning-dark',
			label: 'Reservasi',
			subtitle: 'Meja sudah direservasi',
		},
		reservasi: {
			bgColor: 'bg-warning/40',
			textColor: 'text-warning-light',
			hovertextColor: 'hover:text-warning-dark-2',
			borderColor: 'border-warning-light/30',
			hoverBg: 'hover:bg-warning-dark',
			label: 'Reservasi',
			subtitle: 'Meja sudah direservasi',
		},
	};

	const config = statusConfig[table.status] || statusConfig.available;

	return (
		<div className='bg-primary bg-linear-to-br from-primary-light to-primary/30 rounded-2xl p-5 shadow-md transition-all duration-400 5 border border-transparent'>
			<div className='flex items-start gap-3 mb-4'>
				<div className='w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110'>
					<img
						src={TableImg}
						alt='Meja'
						className='w-7 h-7 object-cover'
					/>
				</div>
				<div className='flex-1'>
					<h3 className='font-bold text-secondary text-lg'>{table.name}</h3>
					<p className='text-sm text-white/60'>{config.subtitle}</p>
				</div>
			</div>

			<div className=' mb-4 text-white/60'>
				<div className='flex items-center justify-between py-2 px-3 '>
					<div className='flex items-center gap-2 '>
						<img
							src={kapasitasIcon}
							alt='Kapasitas'
							className='w-4 h-4'
						/>
						<span className='text-sm font-medium '>Kapasitas</span>
					</div>
					<span className='text-sm font-bold'>{table.capacity} Kursi</span>
				</div>
				<div className='flex items-center justify-between py-2 px-3 '>
					<div className='flex items-center gap-2'>
						<img
							src={lokasiIcon}
							alt='Lokasi'
							className='w-4 h-4'
						/>
						<span className='text-sm font-medium'>Lantai</span>
					</div>
					<span className='text-sm font-bold'>Lantai {table.floor}</span>
				</div>
			</div>

			<button
				onClick={() => {
					// Support both old (tersedia/terpakai/reservasi) and new (available/occupied/reserved) status
					const statusMapping = {
						available: 'occupied',
						tersedia: 'terpakai',
						occupied: 'reserved',
						terpakai: 'reservasi',
						reserved: 'available',
						reservasi: 'tersedia',
					};
					const nextStatus = statusMapping[table.status] || 'available';
					onStatusChange(table.id, nextStatus);
				}}
				className={`w-full py-1 px-3
					 rounded-full ${config.bgColor} ${config.textColor} border-2 ${config.borderColor} 
					 font-bold
					 transition-all duration-700
					 shadow-lg
					 hover:shadow-2xl ${config.hoverBg} hover:scale-105 hover:-translate-y-1 ${config.hovertextColor}
					 active:scale-95 
					 shine-effect overflow-hidden`}>
				<div className='shine-animation'></div>
				{config.label}
			</button>
		</div>
	);
};

export default TableCard;
