import React, { useState, useEffect, useRef } from 'react';
import {
	RefreshCw,
	AlertCircle,
	CheckCircle,
	Video,
	Loader2,
} from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 3000; // 3 seconds

const RealtimeDetection = ({ floor, tables, canvasRef, onDetectionUpdate }) => {
	const [isDetecting, setIsDetecting] = useState(false);
	const [detectionData, setDetectionData] = useState(null);
	const [error, setError] = useState(null);
	const [connectionStatus, setConnectionStatus] = useState('disconnected');
	const [statusMessage, setStatusMessage] = useState(
		'Menghubungkan ke server...'
	);
	const wsRef = useRef(null);
	const reconnectTimeoutRef = useRef(null);
	const reconnectAttemptsRef = useRef(0);
	const currentFloorIdRef = useRef(null);

	useEffect(() => {
		// Listen for centralized detection updates dispatched by TablePage
		const onGlobalDetection = (e) => {
			try {
				const detail = e.detail || {};
				if (!detail || detail.floorId !== floor?.id) return;
				const data = detail.data;
				setDetectionData(data);
				setConnectionStatus('connected');
				setStatusMessage('Terhubung - menerima data deteksi');
				if (onDetectionUpdate) onDetectionUpdate(data);
			} catch (err) {
				console.error('Error handling global detection event', err);
			}
		};

		window.addEventListener('freespot-detection', onGlobalDetection);

		return () => {
			window.removeEventListener('freespot-detection', onGlobalDetection);
		};
	}, [floor?.id, onDetectionUpdate]);

	const startDetection = async () => {
		try {
			console.log('🚀 [FRONTEND] Starting detection...');
			console.log('📍 [FRONTEND] Floor:', floor);
			console.log('📊 [FRONTEND] Tables count:', tables?.length || 0);

			if (!floor || !floor.id) {
				throw new Error('Floor information is missing');
			}

			// Get canvas dimensions from canvasRef
			const canvas = canvasRef?.current;
			const canvasWidth = canvas?.width || 800; // Default 800 if not available
			const canvasHeight = canvas?.height || 600; // Default 600 if not available

			console.log(
				'📐 [FRONTEND] Canvas dimensions:',
				canvasWidth,
				'x',
				canvasHeight
			);

			setError(null);
			setConnectionStatus('connecting');

			// Start detection on backend
			console.log('📡 [FRONTEND] Sending POST request to backend...');
			const response = await fetch(
				`${API_BASE_URL}/detection/start/${floor.id}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						canvas_width: canvasWidth,
						canvas_height: canvasHeight,
					}),
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				console.error('❌ [FRONTEND] Backend returned error:', errorData);
				throw new Error(errorData.detail || 'Failed to start detection');
			}

			const result = await response.json();
			console.log('✅ [FRONTEND] Detection started successfully:', result);
			console.log('⚙️  [FRONTEND] Configuration:', {
				interval: result.detection_interval,
				occupiedThreshold: result.occupied_threshold,
				availableThreshold: result.available_threshold,
			});

			// Connect WebSocket for real-time updates
			console.log('🔌 [FRONTEND] Connecting WebSocket...');
			connectWebSocket();

			setIsDetecting(true);
		} catch (err) {
			console.error('❌ [FRONTEND] Failed to start detection:', err);
			setError(err.message);
			setConnectionStatus('disconnected');
		}
	};

	const stopDetection = async () => {
		try {
			if (!floor || !floor.id) return;
			// Stop detection on backend
			const response = await fetch(
				`${API_BASE_URL}/detection/stop/${floor.id}`,
				{
					method: 'POST',
				}
			);

			if (response.ok) {
				console.log('✅ [FRONTEND] Detection stopped successfully');
			}

			setIsDetecting(false);
			setConnectionStatus('disconnected');
			setDetectionData(null);
		} catch (err) {
			console.error('❌ [FRONTEND] Error stopping detection:', err);
		}
	};

	const connectWebSocket = () => {
		if (!floor || !floor.id) {
			console.error('❌ [WEBSOCKET] Cannot connect - floor is missing');
			return;
		}

		const getStatusBadge = () => {
			switch (connectionStatus) {
				case 'connected':
					return (
						<span className='flex items-center gap-1 text-green-600 text-sm'>
							<CheckCircle className='w-4 h-4' />
							Connected
						</span>
					);
				case 'connecting':
					return (
						<span className='flex items-center gap-1 text-yellow-600 text-sm'>
							<RefreshCw className='w-4 h-4 animate-spin' />
							Connecting...
						</span>
					);
				case 'error':
					return (
						<span className='flex items-center gap-1 text-red-600 text-sm'>
							<AlertCircle className='w-4 h-4' />
							Error
						</span>
					);
				default:
					return (
						<span className='flex items-center gap-1 text-gray-600 text-sm'>
							<AlertCircle className='w-4 h-4' />
							Disconnected
						</span>
					);
			}
		};

		return (
			<div className='bg-white rounded-2xl shadow-lg p-6 mb-6'>
				<div className='flex items-center justify-between mb-4'>
					<div>
						<h3 className='text-xl font-bold text-primary'>
							🎥 Real-Time Detection
						</h3>
						<p className='text-sm text-gray-600'>
							{floor?.name || 'Unknown Floor'} - CCTV Live Monitoring
						</p>
					</div>
					<div className='flex items-center gap-3'>
						{getStatusBadge()}
						<div className='text-xs text-gray-500'>
							{isDetecting ? '🟢 Live' : '⚫ Connecting...'}
						</div>
					</div>
				</div>

				{/* Real-time Status Indicator */}
				<div
					className={`border-l-4 p-4 mb-4 ${isDetecting && detectionData
						? 'bg-green-50 border-green-500'
						: connectionStatus === 'error'
							? 'bg-red-50 border-red-500'
							: 'bg-blue-50 border-blue-500'
						}`}>
					<div className='flex items-center gap-3'>
						{isDetecting && detectionData ? (
							<Video className='w-5 h-5 text-green-600 animate-pulse' />
						) : connectionStatus === 'error' ? (
							<AlertCircle className='w-5 h-5 text-red-600' />
						) : (
							<Loader2 className='w-5 h-5 text-blue-600 animate-spin' />
						)}
						<div>
							<p
								className={`font-semibold ${isDetecting && detectionData
									? 'text-green-700'
									: connectionStatus === 'error'
										? 'text-red-700'
										: 'text-blue-700'
									}`}>
								{statusMessage}
							</p>
							<p
								className={`text-sm ${isDetecting && detectionData
									? 'text-green-600'
									: connectionStatus === 'error'
										? 'text-red-600'
										: 'text-blue-600'
									}`}>
								{isDetecting && detectionData
									? `Memantau ${tables?.length || 0} meja • ${detectionData?.persons_detected || 0} orang terdeteksi`
									: connectionStatus === 'error'
										? 'Terjadi kesalahan pada koneksi'
										: 'Harap tunggu, sistem sedang memproses...'}
							</p>
						</div>
					</div>
				</div>

				{error && (
					<div className='bg-red-50 border-l-4 border-red-500 p-4 mb-4'>
						<div className='flex items-center gap-2'>
							<AlertCircle className='w-5 h-5 text-red-500' />
							<p className='text-red-700 font-medium'>{error}</p>
						</div>
					</div>
				)}

				{detectionData && (
					<div className='space-y-4'>
						{/* Summary Stats */}
						<div className='grid grid-cols-3 gap-4'>
							<div className='bg-blue-50 rounded-xl p-4'>
								<p className='text-sm text-blue-600 font-medium'>
									Persons Detected
								</p>
								<p className='text-3xl font-bold text-blue-700'>
									{detectionData.persons_detected}
								</p>
							</div>
							<div className='bg-green-50 rounded-xl p-4'>
								<p className='text-sm text-green-600 font-medium'>
									Available Tables
								</p>
								<p className='text-3xl font-bold text-green-700'>
									{detectionData.table_status.filter((t) => !t.occupied).length}
								</p>
							</div>
							<div className='bg-red-50 rounded-xl p-4'>
								<p className='text-sm text-red-600 font-medium'>
									Occupied Tables
								</p>
								<p className='text-3xl font-bold text-red-700'>
									{detectionData.table_status.filter((t) => t.occupied).length}
								</p>
							</div>
						</div>

						{/* Table Status List */}
						<div className='border rounded-xl p-4 max-h-96 overflow-y-auto'>
							<h4 className='font-semibold text-gray-700 mb-3'>
								Table Status Details
							</h4>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
								{detectionData.table_status.map((table) => (
									<div
										key={table.id}
										className={`p-3 rounded-lg border-2 ${table.occupied
											? 'bg-red-50 border-red-300'
											: 'bg-green-50 border-green-300'
											}`}>
										<div className='flex items-center justify-between'>
											<span className='font-semibold text-gray-800'>
												{table.name}
											</span>
											<span
												className={`text-xs font-bold px-2 py-1 rounded ${table.occupied
													? 'bg-red-200 text-red-800'
													: 'bg-green-200 text-green-800'
													}`}>
												{table.occupied ? 'OCCUPIED' : 'AVAILABLE'}
											</span>
										</div>
										<div className='mt-1 text-xs text-gray-600'>
											<span>Method: {table.method}</span>
											{table.distance !== null && (
												<span className='ml-2'>Distance: {table.distance}px</span>
											)}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Timestamp */}
						<div className='text-xs text-gray-500 text-center'>
							Terakhir diperbarui:{' '}
							{new Date(detectionData.timestamp).toLocaleString('id-ID')}
						</div>
					</div>
				)}

				{!detectionData && connectionStatus === 'connected' && (
					<div className='text-center py-8 text-gray-500'>
						<Loader2 className='w-8 h-8 animate-spin mx-auto mb-2 text-blue-500' />
						<p className='font-medium'>Deteksi sedang berjalan...</p>
						<p className='text-xs mt-2'>Menunggu data dari CCTV stream</p>
					</div>
				)}

				{connectionStatus === 'connecting' && (
					<div className='text-center py-8 text-gray-500'>
						<Loader2 className='w-8 h-8 animate-spin mx-auto mb-2 text-blue-500' />
						<p className='font-medium'>Menghubungkan ke server deteksi...</p>
						<p className='text-xs mt-2'>Harap tunggu</p>
					</div>
				)}

				{connectionStatus === 'disconnected' && !isDetecting && (
					<div className='text-center py-8 text-gray-500'>
						<RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2' />
						<p className='font-medium'>Menghubungkan ulang...</p>
						<p className='text-xs mt-2'>
							Koneksi terputus, mencoba menghubungkan kembali
						</p>
					</div>
				)}
			</div>
		);
	};
};

export default RealtimeDetection;