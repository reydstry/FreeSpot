import React, { useState, useEffect } from 'react';
import {
	Settings,
	RefreshCw,
	Camera,
	Link as LinkIcon,
	Trash2,
} from 'lucide-react';
import { cctvAPI } from '../services/api';
import { showToast } from '../components/Toast/ToastContainer';
import ResponsiveWrapper from '../context/ResponsiveWrapper';

const SettingsPage = ({ tables = [], floors = [] }) => {
	const STORAGE_KEY = 'freespot_cctv_settings';

	// Get floors from props (DB) or fallback to unique floors from tables
	const getAvailableFloors = () => {
		if (floors && floors.length > 0) {
			return floors.map((f) => f.number).sort((a, b) => a - b);
		}
		// Fallback: extract from tables
		const floorsFromTables = [
			...new Set(tables.map((table) => table.floor)),
		].sort((a, b) => a - b);
		return floorsFromTables.length > 0 ? floorsFromTables : [1];
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
	const [cctvStreams, setCctvStreams] = useState([]); // CCTV streams from DB
	const [isLoading, setIsLoading] = useState(false);

	// Input temporary untuk setiap lantai
	const [inputs, setInputs] = useState(initializeInputs());

	const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', ''

	// Load CCTV streams from DB
	useEffect(() => {
		loadCctvStreams();
	}, []);

	const loadCctvStreams = async () => {
		try {
			setIsLoading(true);
			const streams = await cctvAPI.getAll();
			setCctvStreams(streams);

			// Convert DB streams to feeds format
			const feedsFromDB = {};
			availableFloors.forEach((floor) => {
				const floorObj = floors.find((f) => f.number === floor);
				if (floorObj) {
					const floorStreams = streams.filter(
						(s) => s.floor_id === floorObj.id
					);
					feedsFromDB[floor] = floorStreams.map((s) => ({
						id: s.id,
						url: s.url,
						name: s.name,
						is_active: s.is_active,
					}));
				} else {
					feedsFromDB[floor] = [];
				}
			});

			setCctvFeeds(feedsFromDB);
		} catch (error) {
			console.error('Error loading CCTV streams:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Load dari localStorage saat mount (fallback jika DB tidak tersedia)
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Only use localStorage if no DB data
				if (cctvStreams.length === 0) {
					setCctvFeeds(parsed);
				}
			}
		} catch (error) {
			console.error('Error loading CCTV settings:', error);
		}
	}, [cctvStreams]);

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
	}, [floors.length, tables.length]);

	// Tambah atau update feed untuk lantai tertentu (hanya 1 CCTV per lantai)
	const handleAddFeed = async (floor) => {
		const url = inputs[floor].trim();
		if (!url) return;

		// Validasi sederhana URL
		if (!url.startsWith('http') && !url.startsWith('rtsp')) {
			showToast('URL harus dimulai dengan http/https/rtsp', 'warning');
			return;
		}

		// Peringatan Mixed Content jika web HTTPS tapi CCTV HTTP
		const isPageHttps = window.location.protocol === 'https:';
		const isCctvHttp = url.startsWith('http://');

		if (isPageHttps && isCctvHttp) {
			const proceed = confirm(
				'⚠️ PERINGATAN Mixed Content!\n\n' +
					'Website ini menggunakan HTTPS, tetapi URL CCTV menggunakan HTTP.\n' +
					'Browser akan memblokir konten HTTP pada halaman HTTPS.\n\n' +
					'Solusi:\n' +
					'1. Gunakan URL HTTPS untuk CCTV (jika tersedia)\n' +
					'2. Gunakan IP publik dengan SSL\n' +
					'3. Jalankan aplikasi di localhost untuk testing\n\n' +
					'Lanjutkan menyimpan URL ini?'
			);
			if (!proceed) return;
		}

		// Peringatan untuk IP lokal
		const isLocalIP =
			url.includes('192.168.') ||
			url.includes('10.0.') ||
			url.includes('172.16.') ||
			url.includes('localhost') ||
			url.includes('127.0.0.1');

		if (isLocalIP && isPageHttps) {
			showToast(
				'⚠️ URL menggunakan IP lokal. CCTV hanya bisa diakses dari jaringan lokal yang sama.',
				'warning'
			);
		}

		try {
			setSaveStatus('saving');

			// Get floor_id - pastikan floor adalah number
			const floorNumber = parseInt(floor);
			console.log('🔍 Looking for floor:', floorNumber, 'in floors:', floors);
			const floorObj = floors.find((f) => f.number === floorNumber);
			console.log('✅ Found floor object:', floorObj);

			if (!floorObj) {
				showToast(
					`Floor ${floorNumber} not found. Available floors: ${floors.map((f) => f.number).join(', ')}`,
					'error'
				);
				return;
			}

			// Jika sudah ada feed, update yang existing; jika belum, create baru
			const existingFeed = cctvFeeds[floor]?.[0];

			if (existingFeed && existingFeed.id) {
				// Update existing feed
				await cctvAPI.update(existingFeed.id, {
					name: `CCTV Lantai ${floor}`,
					floor_id: floorObj.id,
					url: url,
					is_active: true,
				});

				// Update local state
				setCctvFeeds((prev) => ({
					...prev,
					[floor]: [
						{
							id: existingFeed.id,
							url: url,
							name: `CCTV Lantai ${floor}`,
							is_active: true,
						},
					],
				}));

				showToast('CCTV stream berhasil diperbarui', 'success');
			} else {
				// Create new feed
				const newStream = await cctvAPI.create({
					name: `CCTV Lantai ${floor}`,
					floor_id: floorObj.id,
					url: url,
					is_active: true,
				});

				// Update local state (replace, not append)
				setCctvFeeds((prev) => ({
					...prev,
					[floor]: [
						{
							id: newStream.id,
							url: newStream.url,
							name: newStream.name,
							is_active: newStream.is_active,
						},
					],
				}));

				showToast('CCTV stream berhasil ditambahkan', 'success');
			}

			setInputs((prev) => ({ ...prev, [floor]: '' }));
			setSaveStatus('saved');
			setTimeout(() => setSaveStatus(''), 2000);

			// Trigger storage event untuk notify TablePage
			window.dispatchEvent(new Event('cctv-updated'));
		} catch (error) {
			console.error('Failed to add/update CCTV stream:', error);
			showToast('Gagal menyimpan CCTV stream: ' + error.message, 'error');
			setSaveStatus('');
		}
	};

	// Hapus feed
	const handleRemoveFeed = async (floor, index) => {
		if (!confirm('Yakin ingin menghapus CCTV stream ini?')) return;

		try {
			const stream = cctvFeeds[floor][index];
			if (stream.id) {
				await cctvAPI.delete(stream.id);
			}

			setCctvFeeds((prev) => ({
				...prev,
				[floor]: prev[floor].filter((_, i) => i !== index),
			}));
		} catch (error) {
			console.error('Failed to delete CCTV stream:', error);
			showToast('Gagal menghapus CCTV stream: ' + error.message, 'error');
		}
	};

	// Reset semua
	const handleResetAll = async () => {
		if (confirm('Yakin ingin menghapus semua pengaturan CCTV?')) {
			try {
				// Delete all streams from DB
				for (const floor of availableFloors) {
					for (const stream of cctvFeeds[floor]) {
						if (stream.id) {
							await cctvAPI.delete(stream.id);
						}
					}
				}

				setCctvFeeds(initializeCctvFeeds());
				setInputs(initializeInputs());
				localStorage.removeItem(STORAGE_KEY);
			} catch (error) {
				console.error('Failed to reset CCTV settings:', error);
				showToast('Gagal menghapus semua CCTV: ' + error.message, 'error');
			}
		}
	};

	return (
		<ResponsiveWrapper>
			<div>
				{isLoading && (
					<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
						<div className='bg-white rounded-2xl p-6 flex items-center gap-3'>
							<RefreshCw className='w-6 h-6 animate-spin text-primary' />
							<span className='font-semibold'>Loading CCTV streams...</span>
						</div>
					</div>
				)}

				<div className='flex items-center justify-between mb-6'>
					<div>
						<h2 className='text-3xl font-bold text-primary mb-2 flex items-center gap-3'>
							<Settings size={28} />
							Pengaturan CCTV
						</h2>
						<p className='text-gray-600'>
							Kelola link RTSP/HLS untuk setiap lantai. Tersimpan otomatis ke
							database.
						</p>
					</div>

					<div className='flex gap-2'>
						<button
							onClick={loadCctvStreams}
							className='px-4 py-2.5 rounded-xl bg-blue-500 text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2'>
							<RefreshCw size={16} />
							Refresh
						</button>
						<button
							onClick={handleResetAll}
							className='px-4 py-2.5 rounded-xl bg-danger text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2'>
							<Trash2 size={16} />
							Reset Semua
						</button>
					</div>
				</div>

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
								className='bg-secondary-light rounded-2xl shadow-lg border border-gray-200 overflow-hidden'>
								<div className='bg-linear-to-r from-primary to-primary-light p-4 text-white'>
									<h3 className='font-bold text-lg flex items-center gap-2'>
										<Camera size={20} />
										Lantai {floor}
									</h3>
									<p className='text-sm opacity-90'>
										{cctvFeeds[floor]?.length > 0
											? '1 CCTV aktif'
											: 'Belum ada CCTV'}
									</p>
								</div>

								<div className='p-4 space-y-4'>
									{/* Input untuk set/update CCTV URL */}
									<div className='space-y-2'>
										<label className='text-sm font-semibold text-primary flex items-center gap-1'>
											<LinkIcon size={14} />
											URL Stream CCTV
										</label>
										<div className='bg-white flex gap-2'>
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
												disabled={
													saveStatus === 'saving' || !inputs[floor]?.trim()
												}
												className='px-4 py-2 rounded-xl bg-success text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-success-dark hover:scale-105 active:scale-95 transition-all'>
												{cctvFeeds[floor]?.length > 0 ? '✓' : '+'}
											</button>
										</div>
										{cctvFeeds[floor]?.length > 0 && (
											<p className='text-xs text-gray-500'>
												Sudah ada CCTV. Masukkan URL baru untuk mengganti.
											</p>
										)}
									</div>

									{/* Tampilkan CCTV yang aktif (hanya 1) */}
									{cctvFeeds[floor]?.length > 0 ? (
										<div className='space-y-2'>
											<p className='text-xs font-semibold text-gray-500 uppercase'>
												CCTV Aktif:
											</p>
											{cctvFeeds[floor].slice(0, 1).map((stream, idx) => (
												<div
													key={stream.id || idx}
													className='flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200'>
													<div className='flex-1 min-w-0'>
														<p className='text-sm font-semibold text-gray-800 mb-1'>
															{stream.name || `CCTV Lantai ${floor}`}
														</p>
														<p className='text-xs font-mono text-gray-600 truncate'>
															{stream.url || stream}
														</p>
														<span className='inline-block mt-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700'>
															Active
														</span>
													</div>
													<button
														onClick={() => handleRemoveFeed(floor, idx)}
														className='text-danger hover:bg-danger/10 p-1 rounded transition-colors shrink-0'
														title='Hapus CCTV'>
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
											<p className='text-sm'>Belum ada CCTV</p>
										</div>
									)}
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</ResponsiveWrapper>
	);
};

export default SettingsPage;
