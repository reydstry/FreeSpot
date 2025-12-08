import React, { useState, useEffect, useMemo } from 'react';
import { Camera, RefreshCcw, Eye, EyeOff } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { API_BASE_URL } from '../../services/api';
import { useStreamStatus } from '../../hooks/useStreamStatus';
import { useTableOverlay } from '../../hooks/useTableOverlay';
import { CANVAS_DEFAULT_WIDTH, CANVAS_DEFAULT_HEIGHT } from '../../constants';

const CctvPanel = ({
	feedsByFloor = {},
	floorOptions = [],
	floorValue = '1',
	onFloorChange,
	onRefresh,
	floors = [],
	tables = [],
	onCctvStatusChange,
}) => {
	// Get feeds for selected floor
	const effectiveFeeds = feedsByFloor[floorValue] || [];
	const hasFeed =
		Array.isArray(effectiveFeeds) &&
		effectiveFeeds.length > 0 &&
		!!effectiveFeeds[0];

	// Table overlay state - per floor
	const [overlayByFloor, setOverlayByFloor] = useState({});
	const showTableOverlay = overlayByFloor[floorValue] || false;

	const toggleOverlay = () => {
		setOverlayByFloor((prev) => ({
			...prev,
			[floorValue]: !prev[floorValue],
		}));
	};

	const [canvasSize, setCanvasSize] = useState({
		width: CANVAS_DEFAULT_WIDTH,
		height: CANVAS_DEFAULT_HEIGHT,
	});

	// Use stream status hook - now per floor
	const {
		streamErrors,
		streamLoaded,
		handleStreamError,
		handleStreamLoad,
		hasLoadedStream,
		isStreamLoading,
		loadedCount,
		errorCount,
		hasErrors,
		refreshCurrentFloor,
		refreshKey,
	} = useStreamStatus(effectiveFeeds, floorValue);

	// Get tables for current floor from props (real-time updated)
	const tableFrames = useMemo(() => {
		const floorNum = parseInt(floorValue);
		return tables.filter((t) => t.floor === floorNum);
	}, [tables, floorValue]);

	// Use table overlay hook
	const { overlayRefs } = useTableOverlay(
		showTableOverlay,
		tableFrames,
		effectiveFeeds,
		canvasSize,
		streamLoaded,
		streamErrors
	);

	// Fetch canvas size from server
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
						width: data.canvas_width || CANVAS_DEFAULT_WIDTH,
						height: data.canvas_height || CANVAS_DEFAULT_HEIGHT,
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

	// Check if online
	const isOnline = hasFeed && hasLoadedStream;

	// Handle refresh - refresh current floor only
	const handleRefresh = () => {
		refreshCurrentFloor();
		if (onRefresh) onRefresh();
	};

	// Report CCTV status to parent component
	useEffect(() => {
		if (onCctvStatusChange) {
			const floorNum = parseInt(floorValue);
			const floorObj = floors.find((f) => f.number === floorNum);
			const floorName = floorObj
				? `Lantai ${floorObj.number}`
				: `Floor ${floorValue}`;

			onCctvStatusChange(floorValue, {
				connected: isOnline,
				floorName,
				feedCount: effectiveFeeds.length,
				loadedCount,
				errorCount,
			});
		}
	}, [
		isOnline,
		floorValue,
		floors,
		effectiveFeeds.length,
		loadedCount,
		errorCount,
		onCctvStatusChange,
	]);

	return (
		<div className='bg-primary rounded-2xl p-4 md:p-6 shadow-lg border border-white/10 mb-6'>
			{/* Header */}
			<CctvHeader
				isOnline={isOnline}
				floorOptions={floorOptions}
				floorValue={floorValue}
				onFloorChange={onFloorChange}
				showTableOverlay={showTableOverlay}
				onToggleOverlay={toggleOverlay}
				onRefresh={handleRefresh}
				isStreamLoading={isStreamLoading}
				hasErrors={hasErrors}
			/>

			{/* Stream Content */}
			{hasFeed ? (
				<StreamGrid
					feeds={effectiveFeeds}
					floorValue={floorValue}
					streamLoaded={streamLoaded}
					streamErrors={streamErrors}
					onStreamLoad={handleStreamLoad}
					onStreamError={handleStreamError}
					showTableOverlay={showTableOverlay}
					overlayRefs={overlayRefs}
					refreshKey={refreshKey}
				/>
			) : (
				<NoFeedPlaceholder />
			)}
		</div>
	);
};

// Sub-components for better organization
const CctvHeader = ({
	isOnline,
	floorOptions,
	floorValue,
	onFloorChange,
	showTableOverlay,
	onToggleOverlay,
	onRefresh,
	isStreamLoading,
	hasErrors,
}) => (
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
			{floorOptions.length > 0 && (
				<CustomDropdown
					value={floorValue}
					onChange={onFloorChange}
					options={floorOptions}
					label='Pilih Lantai'
				/>
			)}

			{/* Toggle Table Overlay Button */}
			<button
				type='button'
				onClick={onToggleOverlay}
				disabled={isStreamLoading || hasErrors}
				className={`p-2 rounded-xl font-bold 
					transition-all duration-700 ease-out
					shadow-md hover:shadow-xl hover:scale-102 hover:-translate-y-1 active:scale-95
					relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed
					text-sm border-2 ${
						showTableOverlay
							? 'bg-success/40 text-success-light hover:text-success-dark-2 border-success-light/30 hover:bg-success-dark'
							: 'bg-linear-to-br from-secondary to-secondary/55 text-primary hover:from-secondary/55 hover:to-secondary'
					}`}>
				<div className='inline-flex items-center gap-2'>
					<Eye size={14} />
					<span className='hidden sm:inline'>
						{showTableOverlay ? 'Frames ON' : 'Frames OFF'}
					</span>
				</div>
				<div className='shine-animation'></div>
			</button>

			{/* Refresh Button */}
			<button
				type='button'
				onClick={onRefresh}
				disabled={isStreamLoading}
				className='p-2 rounded-xl font-bold 
					transition-all duration-700 ease-out
					shadow-md hover:shadow-xl hover:scale-102 hover:-translate-y-1 active:scale-95
					relative overflow-hidden
					text-sm disabled:opacity-50 disabled:cursor-not-allowed
					bg-linear-to-br from-secondary to-secondary/55 text-primary hover:from-secondary/55 hover:to-secondary'>
				<div className='inline-flex items-center gap-2'>
					<RefreshCcw
						size={14}
						className={isStreamLoading ? 'animate-spin' : ''}
					/>
					<span>{isStreamLoading ? 'Loading...' : 'Refresh'}</span>
				</div>
				<div className='shine-animation'></div>
			</button>
		</div>
	</div>
);

const StreamGrid = ({
	feeds,
	floorValue,
	streamLoaded,
	streamErrors,
	onStreamLoad,
	onStreamError,
	showTableOverlay,
	overlayRefs,
	refreshKey,
}) => (
	<div
		className={`grid gap-3 ${feeds.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
		{feeds.map((src, idx) => (
			<StreamItem
				key={`feed-${floorValue}-${idx}-${refreshKey}`}
				src={src}
				idx={idx}
				isLoaded={streamLoaded[idx]}
				hasError={streamErrors[idx]}
				onLoad={() => onStreamLoad(idx)}
				onError={() => onStreamError(idx)}
				showTableOverlay={showTableOverlay}
				overlayRefs={overlayRefs}
			/>
		))}
	</div>
);

const StreamItem = ({
	src,
	idx,
	isLoaded,
	hasError,
	onLoad,
	onError,
	showTableOverlay,
	overlayRefs,
}) => {
	// Detect stream format
	const isImageStream =
		src.endsWith('.m3u8') ||
		src.includes('mjpeg') ||
		src.includes('/video') ||
		src.includes(':8080') ||
		src.includes(':4747') ||
		src.startsWith('rtsp://');

	return (
		<div className='relative w-full overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/60'>
			<div
				style={{ aspectRatio: '16 / 9' }}
				className='w-full relative'>
				{/* Loading skeleton */}
				{!isLoaded && !hasError && (
					<div className='absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20'>
						<div className='w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3'></div>
						<p className='text-white/80 text-sm font-medium'>
							Memuat stream...
						</p>
						<p className='text-white/50 text-xs mt-1'>Menghubungkan ke CCTV</p>
					</div>
				)}

				{/* Error state */}
				{hasError && (
					<div className='absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-black/80 z-20'>
						<div className='text-3xl mb-2'>⚠️</div>
						<p className='font-bold'>Stream Error</p>
						<p className='text-xs px-4 text-center mt-2 text-white/70 break-all'>
							{src}
						</p>
					</div>
				)}

				{/* Stream content */}
				{!hasError && (
					<>
						{isImageStream ? (
							<img
								className='w-full h-full object-cover'
								src={src}
								alt={`CCTV Stream ${idx + 1}`}
								style={{ transform: 'translateZ(0)' }}
								onLoad={onLoad}
								onError={() => {
									console.error('Image load error:', src);
									onError();
								}}
							/>
						) : (
							<video
								className='w-full h-full object-cover'
								src={src}
								autoPlay
								muted
								playsInline
								preload='none'
								onLoadedData={onLoad}
								onError={() => {
									console.error('Video load error:', src);
									onError();
								}}
							/>
						)}
					</>
				)}

				{/* Table Frame Overlay Canvas */}
				{showTableOverlay && !hasError && (
					<canvas
						ref={(el) => (overlayRefs.current[idx] = el)}
						className='absolute inset-0 w-full h-full pointer-events-none'
						style={{ zIndex: 10 }}
					/>
				)}
			</div>

			{/* CCTV Label */}
			<div className='absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-lg text-xs text-white font-mono z-20'>
				CCTV
			</div>
			<div className='pointer-events-none absolute inset-0 bg-linear-to-t from-primary/20 via-transparent to-transparent' />
		</div>
	);
};

const NoFeedPlaceholder = () => (
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
);

export default CctvPanel;
