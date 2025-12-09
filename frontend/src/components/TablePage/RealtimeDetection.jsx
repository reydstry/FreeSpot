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
	const hasAutoStarted = useRef(false);

	useEffect(() => {
		// Auto-connect WebSocket when component mounts
		if (floor && floor.id && !hasAutoStarted.current) {
			console.log('🚀 [AUTO-START] Component mounted, connecting WebSocket...');
			hasAutoStarted.current = true;
			setStatusMessage('Menghubungkan ke server deteksi...');
			connectWebSocket();
		}

		// Cleanup on unmount
		return () => {
			if (wsRef.current) {
				console.log('🧹 [CLEANUP] Closing WebSocket connection');
				wsRef.current.close();
				wsRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		};
	}, [floor]);

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

			// Close WebSocket
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}

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

		// Convert HTTP(S) URL to WS(S) URL properly
		let wsUrl = API_BASE_URL;
		if (wsUrl.startsWith('https://')) {
			wsUrl = wsUrl.replace('https://', 'wss://');
		} else if (wsUrl.startsWith('http://')) {
			wsUrl = wsUrl.replace('http://', 'ws://');
		}
		const fullWsUrl = `${wsUrl}/ws/detection/${floor.id}`;

		console.log('═══════════════════════════════════════════════════');
		console.log('🔌 [WEBSOCKET] CONNECTING TO DETECTION SERVER');
		console.log('═══════════════════════════════════════════════════');
		console.log('📍 API_BASE_URL:', API_BASE_URL);
		console.log('📍 WebSocket URL:', fullWsUrl);
		console.log('📍 Floor ID:', floor.id);
		console.log('📍 Floor Name:', floor.name);
		console.log('═══════════════════════════════════════════════════');

		setStatusMessage('Menghubungkan ke WebSocket...');
		setConnectionStatus('connecting');

		try {
			const ws = new WebSocket(fullWsUrl);

			ws.onopen = () => {
				console.log('═══════════════════════════════════════════════════');
				console.log('✅ [WEBSOCKET] CONNECTION ESTABLISHED!');
				console.log('═══════════════════════════════════════════════════');
				console.log('⏳ Waiting for detection data from server...');
				setConnectionStatus('connected');
				setStatusMessage('Terhubung! Menunggu data deteksi...');
				setIsDetecting(true);
				setError(null);
				// Reset reconnect attempts on successful connection
				reconnectAttemptsRef.current = 0;
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					console.log('═══════════════════════════════════════════════════');
					console.log('📨 [WEBSOCKET] MESSAGE RECEIVED');
					console.log('═══════════════════════════════════════════════════');
					console.log('📦 Full data:', JSON.stringify(data, null, 2));
					console.log('📊 Type:', data.type);
					console.log('📊 Status:', data.status);
					console.log('📊 Timestamp:', data.timestamp);
					if (data.persons_detected !== undefined) {
						console.log('👥 Persons Detected:', data.persons_detected);
					}
					if (data.table_status) {
						console.log(
							'🪑 Tables Status:',
							data.table_status.length,
							'tables'
						);
						data.table_status.forEach((t) => {
							console.log(
								`   - ${t.name}: ${t.occupied ? '🔴 OCCUPIED' : '🟢 AVAILABLE'}`
							);
						});
					}
					if (data.error) {
						console.log('⚠️ Error:', data.error);
					}
					console.log('═══════════════════════════════════════════════════');

					// Handle different message types
					if (data.type === 'connected') {
						console.log(
							'🎉 [DETECTION] Server confirmed connection - detection starting!'
						);
						setStatusMessage(
							`✅ ${data.message || 'Detection sedang berjalan...'}`
						);
						setIsDetecting(true);
						return;
					}

					if (data.type === 'pong' || data.type === 'ping') {
						console.log('💓 [HEARTBEAT] Received:', data.type);
						return;
					}

					if (data.error) {
						console.error('❌ [WEBSOCKET] Error from server:', data.error);
						setError(data.error);
						setStatusMessage(`⚠️ ${data.error}`);
						if (data.status === 'error') {
							setConnectionStatus('error');
						}
						return;
					}

					// Detection data received!
					if (data.status === 'detecting') {
						console.log('🎯 [DETECTION] DETECTION DATA RECEIVED!');
						console.log(`👥 Persons: ${data.persons_detected || 0}`);
						setStatusMessage(
							`🔍 Deteksi berjalan - ${data.persons_detected || 0} orang terdeteksi`
						);
					} else if (data.status === 'connecting') {
						console.log('📹 [DETECTION] Connecting to CCTV stream...');
						setStatusMessage('📹 Menghubungkan ke CCTV...');
					}

					if (data.table_status) {
						setDetectionData(data);
						setConnectionStatus('connected');

						// Call parent callback to update table status in App state
						if (onDetectionUpdate) {
							console.log(
								'🔄 [WEBSOCKET] Calling onDetectionUpdate with table_status'
							);
							onDetectionUpdate(data);
						}
					}
				} catch (err) {
					console.error('❌ [WEBSOCKET] Failed to parse message:', err);
					console.error('Raw event data:', event.data);
				}
			};

			ws.onerror = (error) => {
				console.log('═══════════════════════════════════════════════════');
				console.error('❌ [WEBSOCKET] CONNECTION ERROR');
				console.log('═══════════════════════════════════════════════════');
				console.error('Error object:', error);
				console.log('This usually means:');
				console.log('1. Backend server is not running');
				console.log('2. WebSocket URL is incorrect');
				console.log('3. CORS issue');
				console.log('4. Network connectivity problem');
				console.log('═══════════════════════════════════════════════════');
				setConnectionStatus('error');
				setStatusMessage('❌ Koneksi error. Mencoba ulang...');
				setError('Connection error. Retrying...');
			};

			ws.onclose = (event) => {
				console.log('═══════════════════════════════════════════════════');
				console.log('🔌 [WEBSOCKET] CONNECTION CLOSED');
				console.log('═══════════════════════════════════════════════════');
				console.log('Close code:', event.code);
				console.log('Close reason:', event.reason || 'No reason provided');
				console.log('Was clean:', event.wasClean);
				console.log('Reconnect attempts:', reconnectAttemptsRef.current, '/', MAX_RECONNECT_ATTEMPTS);
				console.log('═══════════════════════════════════════════════════');

				setConnectionStatus('disconnected');

				// Only auto-reconnect if under the limit
				if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
					reconnectAttemptsRef.current += 1;
					const delay = BASE_RECONNECT_DELAY * reconnectAttemptsRef.current; // Exponential backoff
					setStatusMessage(`Koneksi terputus. Mencoba ulang (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
					
					console.log(`🔄 [WEBSOCKET] Will attempt to reconnect in ${delay/1000} seconds... (attempt ${reconnectAttemptsRef.current})`);
					reconnectTimeoutRef.current = setTimeout(() => {
						console.log('🔄 [WEBSOCKET] Reconnecting...');
						connectWebSocket();
					}, delay);
				} else {
					console.log('❌ [WEBSOCKET] Max reconnect attempts reached. Please refresh the page.');
					setStatusMessage('❌ Koneksi gagal. Silakan refresh halaman.');
					setError('Max reconnect attempts reached');
					setIsDetecting(false);
				}
			};

			wsRef.current = ws;
		} catch (err) {
			console.error('❌ [WEBSOCKET] Failed to create WebSocket:', err);
			setError('Failed to create WebSocket connection');
			setConnectionStatus('error');
		}
	};

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
				className={`border-l-4 p-4 mb-4 ${
					isDetecting && detectionData
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
							className={`font-semibold ${
								isDetecting && detectionData
									? 'text-green-700'
									: connectionStatus === 'error'
										? 'text-red-700'
										: 'text-blue-700'
							}`}>
							{statusMessage}
						</p>
						<p
							className={`text-sm ${
								isDetecting && detectionData
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
									className={`p-3 rounded-lg border-2 ${
										table.occupied
											? 'bg-red-50 border-red-300'
											: 'bg-green-50 border-green-300'
									}`}>
									<div className='flex items-center justify-between'>
										<span className='font-semibold text-gray-800'>
											{table.name}
										</span>
										<span
											className={`text-xs font-bold px-2 py-1 rounded ${
												table.occupied
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

export default RealtimeDetection;
