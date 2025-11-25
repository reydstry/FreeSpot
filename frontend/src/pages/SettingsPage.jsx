import React, { useState, useEffect } from 'react';
import {
	Settings,
	Save,
	RefreshCw,
	Camera,
	Link as LinkIcon,
	Trash2,
} from 'lucide-react';

const SettingsPage = ({ tables = [] }) => {
	const STORAGE_KEY = 'freespot_cctv_settings';

	// Get unique floors from tables
	const getAvailableFloors = () => {
		const floors = [...new Set(tables.map((table) => table.floor))].sort(
			(a, b) => a - b
		);
		return floors.length > 0 ? floors : [1];
	};

	const availableFloors = getAvailableFloors();

	// Initialize state based on available floors
	const initializeCctvFeeds = () => {
		const feeds = {};
		availableFloors.forEach((floor) => {
			feeds[floor] = [];
		});
		return feeds;
	};

	const initializeInputs = () => {
		const inputs = {};
		availableFloors.forEach((floor) => {
			inputs[floor] = '';
		});
		return inputs;
	};

	// State untuk feeds per lantai
	const [cctvFeeds, setCctvFeeds] = useState(initializeCctvFeeds());

	// Input temporary untuk setiap lantai
	const [inputs, setInputs] = useState(initializeInputs());

	const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', ''

	// Load dari localStorage saat mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				setCctvFeeds(parsed);
			}
		} catch (error) {
			console.error('Error loading CCTV settings:', error);
		}
	}, []);

	// Update feeds when available floors change
	useEffect(() => {
		setCctvFeeds((prevFeeds) => {
			const newFeeds = {};
			availableFloors.forEach((floor) => {
				newFeeds[floor] = prevFeeds[floor] || [];
			});
			return newFeeds;
		});

		setInputs((prevInputs) => {
			const newInputs = {};
			availableFloors.forEach((floor) => {
				newInputs[floor] = prevInputs[floor] || '';
			});
			return newInputs;
		});
	}, [tables.length]);

	// Simpan ke localStorage
	const handleSaveSettings = () => {
		try {
			setSaveStatus('saving');
			localStorage.setItem(STORAGE_KEY, JSON.stringify(cctvFeeds));
			setTimeout(() => {
				setSaveStatus('saved');
				setTimeout(() => setSaveStatus(''), 2000);
			}, 500);
		} catch (error) {
			console.error('Error saving CCTV settings:', error);
			alert('Gagal menyimpan pengaturan!');
		}
	};

	// Tambah feed untuk lantai tertentu
	const handleAddFeed = (floor) => {
		const url = inputs[floor].trim();
		if (!url) return;

		// Validasi sederhana URL
		if (!url.startsWith('http') && !url.startsWith('rtsp')) {
			alert('URL harus dimulai dengan http/https/rtsp');
			return;
		}

		setCctvFeeds((prev) => ({
			...prev,
			[floor]: [...prev[floor], url],
		}));

		setInputs((prev) => ({ ...prev, [floor]: '' }));
	};

	// Hapus feed
	const handleRemoveFeed = (floor, index) => {
		setCctvFeeds((prev) => ({
			...prev,
			[floor]: prev[floor].filter((_, i) => i !== index),
		}));
	};

	// Reset semua
	const handleResetAll = () => {
		if (confirm('Yakin ingin menghapus semua pengaturan CCTV?')) {
			setCctvFeeds(initializeCctvFeeds());
			setInputs(initializeInputs());
			localStorage.removeItem(STORAGE_KEY);
		}
	};

	return (
		<div>
			<div className='flex items-center justify-between mb-6'>
				<div>
					<h2 className='text-3xl font-bold text-primary mb-2 flex items-center gap-3'>
						<Settings size={28} />
						Pengaturan CCTV
					</h2>
					<p className='text-gray-600'>
						Kelola link RTSP/HLS untuk setiap lantai. Link akan ditampilkan di
						halaman Status Meja.
					</p>
				</div>

				<div className='flex gap-2'>
					<button
						onClick={handleResetAll}
						className='px-4 py-2.5 rounded-xl bg-danger text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2'>
						<Trash2 size={16} />
						Reset Semua
					</button>
					<button
						onClick={handleSaveSettings}
						disabled={saveStatus === 'saving'}
						className={`px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2 ${
							saveStatus === 'saved'
								? 'bg-success text-white'
								: 'bg-primary text-white hover:bg-primary-dark'
						}`}>
						{saveStatus === 'saving' ? (
							<RefreshCw
								size={16}
								className='animate-spin'
							/>
						) : saveStatus === 'saved' ? (
							'✓'
						) : (
							<Save size={16} />
						)}
						{saveStatus === 'saved' ? 'Tersimpan!' : 'Simpan Pengaturan'}
					</button>
				</div>
			</div>

			{/* Cards per lantai */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{availableFloors.length === 0 ? (
					<div className='col-span-3 text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300'>
						<Camera
							size={48}
							className='mx-auto mb-4 text-gray-400'
						/>
						<h3 className='text-xl font-bold text-gray-600 mb-2'>
							Belum Ada Lantai
						</h3>
						<p className='text-gray-500'>
							Silakan tambahkan lantai terlebih dahulu di halaman Setup Meja
						</p>
					</div>
				) : (
					availableFloors.map((floor) => (
						<div
							key={floor}
							className='bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden'>
							{/* Header */}
							<div className='bg-linear-to-r from-primary to-primary-light p-4 text-white'>
								<h3 className='font-bold text-lg flex items-center gap-2'>
									<Camera size={20} />
									Lantai {floor}
								</h3>
								<p className='text-sm opacity-90'>
									{cctvFeeds[floor]?.length || 0} feed terdaftar
								</p>
							</div>

							{/* Body */}
							<div className='p-4 space-y-4'>
								{/* Input tambah feed */}
								<div className='space-y-2'>
									<label className='text-sm font-semibold text-primary flex items-center gap-1'>
										<LinkIcon size={14} />
										URL Stream RTSP/HLS
									</label>
									<div className='flex gap-2'>
										<input
											type='text'
											placeholder='rtsp://... atau https://...m3u8'
											value={inputs[floor] || ''}
											onChange={(e) =>
												setInputs((prev) => ({
													...prev,
													[floor]: e.target.value,
												}))
											}
											onKeyDown={(e) => {
												if (e.key === 'Enter') handleAddFeed(floor);
											}}
											className='flex-1 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors text-sm'
										/>
										<button
											onClick={() => handleAddFeed(floor)}
											disabled={!inputs[floor]?.trim()}
											className='px-4 py-2 rounded-xl bg-success text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-success-dark hover:scale-105 active:scale-95 transition-all'>
											+
										</button>
									</div>
								</div>

								{/* Daftar feeds */}
								{cctvFeeds[floor]?.length > 0 ? (
									<div className='space-y-2 max-h-64 overflow-y-auto'>
										<p className='text-xs font-semibold text-gray-500 uppercase'>
											Daftar Feed:
										</p>
										{cctvFeeds[floor].map((url, idx) => (
											<div
												key={idx}
												className='flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 group hover:border-danger/30 transition-colors'>
												<div className='flex-1 min-w-0'>
													<p className='text-xs font-mono text-gray-700 truncate'>
														{url}
													</p>
												</div>
												<button
													onClick={() => handleRemoveFeed(floor, idx)}
													className='text-danger hover:bg-danger/10 p-1 rounded transition-colors shrink-0'>
													<Trash2 size={14} />
												</button>
											</div>
										))}
									</div>
								) : (
									<div className='text-center py-8 text-gray-400'>
										<Camera
											size={32}
											className='mx-auto mb-2 opacity-50'
										/>
										<p className='text-sm'>Belum ada feed</p>
									</div>
								)}
							</div>
						</div>
					))
				)}
			</div>

			{/* Info box */}
			<div className='mt-6 bg-info-light/10 border border-info/20 rounded-2xl p-5'>
				<h4 className='font-bold text-info-dark mb-2 flex items-center gap-2'>
					<span className='text-lg'>💡</span>
					Catatan Penting
				</h4>
				<ul className='text-sm text-gray-700 space-y-1.5 list-disc list-inside'>
					<li>
						Browser{' '}
						<code className='bg-gray-200 px-1.5 py-0.5 rounded'>
							tidak mendukung RTSP
						</code>{' '}
						langsung. Gunakan server konverter ke HLS (m3u8) atau WebRTC.
					</li>
					<li>
						Contoh URL HLS:{' '}
						<code className='bg-gray-200 px-1.5 py-0.5 rounded'>
							https://example.com/stream.m3u8
						</code>
					</li>
					<li>
						Gunakan tools seperti <strong>ffmpeg</strong>,{' '}
						<strong>rtsp-simple-server</strong>, atau{' '}
						<strong>Ant Media Server</strong> untuk konversi.
					</li>
					<li>
						Setelah menyimpan, refresh halaman <strong>Status Meja</strong>{' '}
						untuk melihat perubahan.
					</li>
					<li>
						Pengaturan disimpan di browser (localStorage) dan tidak hilang saat
						refresh.
					</li>
				</ul>
			</div>
		</div>
	);
};

export default SettingsPage;
