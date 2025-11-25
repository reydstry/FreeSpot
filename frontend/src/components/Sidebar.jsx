import React from 'react';
import logoImg from '../assets/logo.png';

const Sidebar = ({
	activePage,
	setActivePage,
	isMinimized,
	setIsMinimized,
}) => {
	const menuItems = [
		{ id: 'meja', label: 'Meja', icon: '🪑' },
		{ id: 'edit', label: 'Edit Layout', icon: '✏️' },
	];

	return (
		<aside
			className={`bg-secondary/85 text-primary flex flex-col transition-all duration-300 shadow-2xl border-r border 1 border-primary ${
				isMinimized ? 'w-[78px]' : 'w-[260px]'
			}`}>
			<div
				className={`p-3 flex items-center bg-primary text-secondary ${
					isMinimized ? 'justify-center' : 'justify-between'
				}`}>
				{!isMinimized && (
					<div className='flex items-center gap-3'>
						<div className='w-9 h-9 rounded-lg overflow-hidden shrink-0'>
							<img
								src={logoImg}
								alt='logo-brand'
								className='w-full h-full object-cover'
							/>
						</div>
						<div className='flex flex-col leading-tight'>
							<div className='text-lg font-extrabold'>FreeSpot</div>
							<div className='text-xs opacity-65'>Dashboard</div>
						</div>
					</div>
				)}

				<button
					className='w-10 h-10 bg-transparent text-secondary hover:bg-primary-light-2/30  rounded-xl transition-all duration-300 flex items-center justify-center text-xl hover:scale-110 hover:shadow-lg'
					onClick={() => setIsMinimized(!isMinimized)}
					title={isMinimized ? 'Perbesar' : 'Perkecil'}
					aria-label='Toggle sidebar'>
					☰
				</button>
			</div>

			<nav className='flex-1 p-3 flex flex-col gap-2 overflow-y-auto'>
				{menuItems.map((item) => (
					<button
						key={item.id}
						className={`flex items-center gap-2 w-full px-2.5 py-2.5 rounded-full transition-all duration-300 whitespace-nowrap text-base font-medium active:scale-95 ${
							activePage === item.id
								? 'bg-primary text-secondary shadow-md shadow-black/25 scale-105'
								: 'bg-transparent text-primary hover:bg-primary/30 hover:text-secondary hover:shadow-md hover:shadow-black/25 hover:scale-105'
						} ${isMinimized ? 'justify-center' : 'justify-start'}`}
						onClick={() => setActivePage(item.id)}
						title={isMinimized ? item.label : ''}>
						<span
							className='w-7 h-7 rounded-full flex items-center justify-center shrink-0'
							aria-hidden>
							{item.icon}
						</span>
						{!isMinimized && (
							<span className='flex-1 text-left'>{item.label}</span>
						)}
						{!isMinimized && item.badge && (
							<span className='px-2 py-0.5 text-xs bg-yellow-400 text-gray-900 rounded-full font-bold'>
								{item.badge}
							</span>
						)}
					</button>
				))}
			</nav>

			<div className='bg-primary p-2.5'>
				<button
					className={`flex items-center gap-2 w-full px-2 py-2 rounded-md transition-all duration-300 whitespace-nowrap text-base font-medium ${
						activePage === 'settings'
							? 'bg-secondary text-primary shadow-xl scale-105'
							: 'text-secondary hover:bg-primary-light-2/30 hover:shadow-lg '
					} ${isMinimized ? 'justify-center' : 'justify-start'}`}
					onClick={() => setActivePage('settings')}
					title={isMinimized ? 'Pengaturan' : ''}>
					<span
						className='w-7 h-7 rounded-full flex items-center justify-center shrink-0'
						aria-hidden>
						⚙️
					</span>
					{!isMinimized && <span className='flex-1 text-left'>Pengaturan</span>}
				</button>
			</div>
		</aside>
	);
};

export default Sidebar;
