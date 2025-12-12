import React from 'react';

const BottomBar = ({ activePage, setActivePage }) => {
	const menu = [
		{ id: 'meja', label: 'Meja', icon: '🪑' },
		{ id: 'edit', label: 'Edit', icon: '✏️' },
		{ id: 'settings', label: 'Pengaturan', icon: '⚙️' },
	];

	return (
		<nav className='fixed bottom-0 left-0 right-0 h-16 bg-primary text-secondary flex items-center justify-between px-2 shadow-xl z-50 sm:hidden'>
			{menu.map((it) => {
				const active = activePage === it.id;

				return (
					<button
						key={it.id}
						onClick={() => setActivePage(it.id)}
						className={`relative flex-1 h-full flex flex-col items-center justify-center gap-0.5 overflow-hidden transition-all duration-300`}>
						<div
							className={`absolute bottom-0 left-0 right-0 h-10 rounded-t-2xl transition-all duration-300 ${
								active
									? 'bg-secondary opacity-100 translate-y-0'
									: 'opacity-0 translate-y-5'
							}`}
            />
            
						<span
							className={`text-xl relative z-10 transition-all duration-300 ${
								active
									? 'scale-125 -translate-y-1 text-primary'
									: 'scale-100 translate-y-0 text-secondary opacity-70'
							}`}>
							{it.icon}
						</span>

						<span
							className={`text-[11px] relative z-10 transition-all duration-300 ${
								active
									? 'opacity-100 text-primary translate-y-0'
									: 'opacity-0 translate-y-1'
							}`}>
							{it.label}
						</span>
					</button>
				);
			})}
		</nav>
	);
};

export default BottomBar;
