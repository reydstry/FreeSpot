import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCcw, Eye, EyeOff } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { API_BASE_URL } from '../../services/api';

const CctvPanel = ({
	feedsByFloor = {},
	floorOptions = [],
	floorValue = '1',
	onFloorChange,
	onRefresh,
	isLoading = false,
	floors = [], // Add floors prop to get floor objects
	tables = [], // Add tables prop for real-time status updates
}) => {
	// Get feeds for selected floor
	const effectiveFeeds = feedsByFloor[floorValue] || [];
	const hasFeed =
		Array.isArray(effectiveFeeds) &&
		effectiveFeeds.length > 0 &&
		!!effectiveFeeds[0];

	// Track error state for each feed
	const [streamErrors, setStreamErrors] = useState({});
	const [streamLoaded, setStreamLoaded] = useState({});

	// Table overlay state
	const [showTableOverlay, setShowTableOverlay] = useState(true);
	const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });

	// Refs for canvas overlays
	const overlayRefs = useRef({});

	// Get tables for current floor from props (real-time updated)
	const tableFrames = React.useMemo(() => {
		const floorNum = parseInt(floorValue);
		return tables.filter((t) => t.floor === floorNum);
	}, [tables, floorValue]);

	// Reset errors and loaded state when floor changes or feeds count changes
	useEffect(() => {
		setStreamErrors({});
		setStreamLoaded({});
	}, [floorValue, effectiveFeeds.length]);

	// Fetch canvas size from server (only need dimensions, not table data)
	useEffect(() => {
		const fetchCanvasSize = async () => {
			try {
				const floorNum = parseInt(floorValue);
				const floorObj = floors.find((f) => f.number === floorNum);

				if (!floorObj) return;

				const response = await fetch(
					`${API_BASE_URL}/tables/with-frames/${floorObj.id}`
				);
				if (response.ok) {
					const data = await response.json();
					setCanvasSize({
						width: data.canvas_width || 1280,
						height: data.canvas_height || 720,
					});
				}
			} catch (error) {
				console.error('Failed to fetch canvas size:', error);
			}
		};

		if (floorValue && floors.length > 0) {
			fetchCanvasSize();
		}
	}, [floorValue, floors]);

	// Draw table overlays on canvas
	useEffect(() => {
		if (!showTableOverlay || tableFrames.length === 0) return;

		effectiveFeeds.forEach((_, idx) => {
			const canvas = overlayRefs.current[idx];
			if (!canvas) return;

			const ctx = canvas.getContext('2d');
			const container = canvas.parentElement;
			if (!container) return;

			// Get actual display size
			const displayWidth = container.offsetWidth;
			const displayHeight = container.offsetHeight;

			// Set canvas size to match display
			canvas.width = displayWidth;
			canvas.height = displayHeight;

			// Calculate scale factors
			const scaleX = displayWidth / canvasSize.width;
			const scaleY = displayHeight / canvasSize.height;

			// Clear canvas
			ctx.clearRect(0, 0, displayWidth, displayHeight);

			// Draw each table frame
			tableFrames.forEach((table) => {
				// coords can be [x, y] or [x1, y1, x2, y2] depending on source
				const coords = table.coords || [0, 0];
				const rotation = table.rotation || 0;
				const tableWidth = table.width || 100;
				const tableHeight = table.height || 100;

				// Calculate x1, y1, x2, y2 from coords
				let x1, y1, x2, y2;
				if (coords.length === 4) {
					// Old format: [x1, y1, x2, y2]
					x1 = coords[0] * scaleX;
					y1 = coords[1] * scaleY;
					x2 = coords[2] * scaleX;
					y2 = coords[3] * scaleY;
				} else {
					// New format: [x, y] + width/height
					x1 = coords[0] * scaleX;
					y1 = coords[1] * scaleY;
					x2 = (coords[0] + tableWidth) * scaleX;
					y2 = (coords[1] + tableHeight) * scaleY;
				}

				const width = x2 - x1;
				const height = y2 - y1;
				const centerX = (x1 + x2) / 2;
				const centerY = (y1 + y2) / 2;

				ctx.save();
				ctx.translate(centerX, centerY);
				ctx.rotate(rotation);

				// Draw border based on status
				const isOccupied = table.status === 'occupied';
				ctx.strokeStyle = isOccupied
					? 'rgba(239, 68, 68, 0.9)'
					: 'rgba(34, 197, 94, 0.9)';
				ctx.lineWidth = 2;
				ctx.setLineDash([5, 5]);
				ctx.strokeRect(-width / 2, -height / 2, width, height);

				// Draw fill
				ctx.fillStyle = isOccupied
					? 'rgba(239, 68, 68, 0.15)'
					: 'rgba(34, 197, 94, 0.15)';
				ctx.fillRect(-width / 2, -height / 2, width, height);

				// Draw table name
				ctx.setLineDash([]);
				ctx.fillStyle = isOccupied
					? 'rgba(239, 68, 68, 1)'
					: 'rgba(34, 197, 94, 1)';
				ctx.font = 'bold 12px Arial';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';

				// Draw background for text
				const textMetrics = ctx.measureText(table.name);
				const textWidth = textMetrics.width + 8;
				const textHeight = 16;
				ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
				ctx.fillRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight);

				// Draw text
				ctx.fillStyle = isOccupied ? '#ef4444' : '#22c55e';
				ctx.fillText(table.name, 0, 0);

				// Draw status indicator
				const statusText = isOccupied ? '● OCCUPIED' : '○ AVAILABLE';
				ctx.font = 'bold 9px Arial';
				const statusY = height / 2 - 8;
				ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
				const statusMetrics = ctx.measureText(statusText);
				ctx.fillRect(
					-statusMetrics.width / 2 - 4,
					statusY - 6,
					statusMetrics.width + 8,
					12
				);
				ctx.fillStyle = isOccupied ? '#ef4444' : '#22c55e';
				ctx.fillText(statusText, 0, statusY);

				ctx.restore();
			});
		});
	}, [showTableOverlay, tableFrames, effectiveFeeds, canvasSize, streamLoaded]);

	const handleStreamError = (idx) => {
		setStreamErrors((prev) => ({ ...prev, [idx]: true }));
	};

	const handleStreamLoad = (idx) => {
		setStreamLoaded((prev) => ({ ...prev, [idx]: true }));
	};

	// Check if at least one stream is loaded successfully
	const hasLoadedStream = Object.keys(streamLoaded).some(
		(key) => streamLoaded[key] && !streamErrors[key]
	);
	const isOnline = hasFeed && hasLoadedStream;

	return (
		<div className='bg-primary rounded-2xl p-4 md:p-6 shadow-lg border border-white/10 mb-6'>
			<div className='flex items-center justify-between mb-4'>
				<div className='flex items-center gap-3 text-secondary'>
					<span className='inline-flex items-center gap-2 font-bold'>
						<Camera size={18} />
						CCTV Live
					</span>
					{isOnline ? (
						<span className='hidden sm:inline-flex items-center gap-2 text-success font-semibold'>
							<span className='w-2 h-2 rounded-full bg-success animate-pulse' />
							Online
						</span>
					) : (
						<span className='hidden sm:inline-flex items-center gap-2 text-danger font-semibold'>
							<span className='w-2 h-2 rounded-full bg-danger animate-pulse' />
							Offline
						</span>
					)}
				</div>
				<div className='flex items-center gap-2'>
					{/* Toggle Table Overlay Button */}
					<button
						type='button'
						onClick={() => setShowTableOverlay(!showTableOverlay)}
						className={`px-3 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-200 ${
							showTableOverlay
								? 'bg-success text-white'
								: 'bg-secondary text-primary'
						}`}
						title={
							showTableOverlay ? 'Hide Table Frames' : 'Show Table Frames'
						}>
						<div className='inline-flex items-center gap-2'>
							{showTableOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
							<span className='hidden sm:inline'>
								{showTableOverlay ? 'Frames ON' : 'Frames OFF'}
							</span>
						</div>
					</button>

					{floorOptions.length > 0 && (
						<CustomDropdown
							value={floorValue}
							onChange={onFloorChange}
							options={floorOptions}
							label='Pilih Lantai'
						/>
					)}
					<button
						type='button'
						onClick={onRefresh}
						disabled={isLoading}
						className='px-3 py-2 rounded-xl bg-secondary text-primary font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
						<div className='inline-flex items-center gap-2'>
							<RefreshCcw
								size={16}
								className={isLoading ? 'animate-spin' : ''}
							/>
							<span>{isLoading ? 'Loading...' : 'Refresh'}</span>
						</div>
					</button>
				</div>
			</div>

			{/* Table Frames Legend */}
			{showTableOverlay && tableFrames.length > 0 && (
				<div className='mb-3 p-2 bg-black/30 rounded-lg flex items-center gap-4 text-xs text-white/80'>
					<span className='font-semibold'>Legend:</span>
					<span className='flex items-center gap-1'>
						<span className='w-3 h-3 border-2 border-green-500 bg-green-500/20 rounded-sm'></span>
						Available
					</span>
					<span className='flex items-center gap-1'>
						<span className='w-3 h-3 border-2 border-red-500 bg-red-500/20 rounded-sm'></span>
						Occupied
					</span>
					<span className='ml-auto'>
						{tableFrames.length} table(s) on this floor
					</span>
				</div>
			)}

			{hasFeed ? (
				<div
					className={`grid gap-3 ${effectiveFeeds.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
					{effectiveFeeds.map((src, idx) => {
						// Deteksi format stream
						const isImageStream =
							src.endsWith('.m3u8') ||
							src.includes('mjpeg') ||
							src.includes('/video') || // IP Webcam format
							src.includes(':8080') || // DroidCam format
							src.includes(':4747') || // IP Webcam default port
							src.startsWith('rtsp://'); // RTSP juga pakai img

						return (
							<div
								key={idx}
								className='relative w-full overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/60'>
								<div
									style={{ aspectRatio: '16 / 9' }}
									className='w-full relative'>
									{isImageStream ? (
										<img
											className='w-full h-full object-cover'
											src={src}
											alt={`CCTV Stream ${idx + 1}`}
											onLoad={() => handleStreamLoad(idx)}
											onError={(e) => {
												console.error('Image load error:', src);
												handleStreamError(idx);
												e.target.style.display = 'none';
												e.target.parentElement.innerHTML = `
													<div class="absolute inset-0 flex flex-col items-center justify-center text-red-500">
														<div class="text-3xl mb-2">⚠️</div>
														<p class="font-bold">Stream Error</p>
														<p class="text-xs px-4 text-center mt-2 text-white/70">${src}</p>
													</div>
												`;
											}}
										/>
									) : (
										<video
											className='w-full h-full object-cover'
											src={src}
											controls
											autoPlay
											muted
											loop
											playsInline
											onLoadedData={() => handleStreamLoad(idx)}
											onError={(e) => {
												console.error('Video load error:', src);
												handleStreamError(idx);
											}}
										/>
									)}

									{/* Table Frame Overlay Canvas */}
									{showTableOverlay && (
										<canvas
											ref={(el) => (overlayRefs.current[idx] = el)}
											className='absolute inset-0 w-full h-full pointer-events-none'
											style={{ zIndex: 10 }}
										/>
									)}
								</div>
								<div className='absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-lg text-xs text-white font-mono z-20'>
									CCTV {idx + 1}
								</div>
								<div className='pointer-events-none absolute inset-0 bg-linear-to-t from-primary/20 via-transparent to-transparent' />
							</div>
						);
					})}
				</div>
			) : (
				<div className='relative w-full overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/60'>
					<div
						style={{ aspectRatio: '16 / 9' }}
						className='w-full'>
						<div className='absolute inset-0 flex flex-col items-center justify-center text-secondary/90 select-none'>
							<div className='text-5xl mb-3'>📹</div>
							<p className='font-bold text-lg'>Belum ada feed</p>
							<p className='text-sm opacity-80'>
								Masukkan URL stream untuk menampilkan CCTV
							</p>
						</div>
					</div>
					<div className='pointer-events-none absolute inset-0 bg-linear-to-t from-primary/20 via-transparent to-transparent' />
				</div>
			)}
		</div>
	);
};

export default CctvPanel;
