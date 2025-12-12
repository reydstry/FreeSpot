// ...existing code...
import React from 'react';

/**
 * Simple mobile bottom bar.
 * Usage: <BottomBar activePage={activePage} setActivePage={setActivePage} />
 */
const BottomBar = ({ activePage, setActivePage }) => {
	const menu = [
		{ id: 'meja', label: 'Meja', icon: '🪑' },
		{ id: 'edit', label: 'Edit', icon: '✏️' },
		{ id: 'settings', label: 'Pengaturan', icon: '⚙️' },
	];

	return (
		<nav className='fixed bottom-0 left-0 right-0 h-16 bg-primary text-secondary flex items-center justify-between px-2 shadow-lg z-50 sm:hidden'>
			{menu.map((it) => {
				const active = activePage === it.id;
				return (
					<button
						key={it.id}
						onClick={() => setActivePage(it.id)}
						className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
							active ? 'text-secondary bg-primary/80' : 'text-secondary/80'
						}`}>
						<span className='text-xl'>{it.icon}</span>
						<span className='text-[11px] leading-none mt-0.5'>{it.label}</span>
					</button>
				);
			})}
		</nav>
	);
};

export default BottomBar;