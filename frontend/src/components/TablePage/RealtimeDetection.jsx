import React, { useState, useEffect, useRef } from 'react';
import {
	RefreshCw,
	AlertCircle,
	CheckCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

const RealtimeDetection = ({ floor, tables, canvasRef, onDetectionUpdate }) => {
	const [isDetecting, setIsDetecting] = useState(false);
	const [detectionData, setDetectionData] = useState(null);
	const [error, setError] = useState(null);
	const [connectionStatus, setConnectionStatus] = useState('disconnected');
	const wsRef = useRef(null);
	const reconnectTimeoutRef = useRef(null);
	const hasAutoStarted = useRef(false);

	useEffect(() => {
		// Auto-connect WebSocket when component mounts
		if (floor && floor.id && !hasAutoStarted.current) {
			console.log(
				'🚀 [AUTO-START] Component mounted, checking detection status...'
			);
			hasAutoStarted.current = true;
			checkDetectionStatus();
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

	const checkDetectionStatus = async () => {
		try {
			console.log('🔍 [STATUS CHECK] Checking if detection is running...');
			const response = await fetch(`${API_BASE_URL}/detection/status`);

			if (response.ok) {
				const data = await response.json();
				console.log('📊 [STATUS CHECK] Detection status:', data);

				// Check if detection is running for this floor
				const isRunning = data.streams && data.streams[floor.id];

				if (isRunning) {
					console.log(
						'✅ [AUTO-START] Detection already running, connecting WebSocket...'
					);
					setIsDetecting(true);
					connectWebSocket();
				} else {
					console.log(
						'⚠️  [AUTO-START] Detection not running yet, will auto-connect when available'
					);
					// Try again after 2 seconds
					setTimeout(checkDetectionStatus, 2000);
				}
			}
		} catch (err) {
			console.error('❌ [STATUS CHECK] Failed to check status:', err);
		}
	};

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
		if (!floor || !floor.id) return;

		const wsUrl = API_BASE_URL.replace('http', 'ws');
		const fullWsUrl = `${wsUrl}/ws/detection/${floor.id}`;
		console.log('🔌 [WEBSOCKET] Connecting to:', fullWsUrl);

		const ws = new WebSocket(fullWsUrl);

		ws.onopen = () => {
			console.log('✅ [WEBSOCKET] Connection established');
			console.log('⏳ [WEBSOCKET] Waiting for detection data...');
			setConnectionStatus('connected');
			setError(null);
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				console.log('📨 [WEBSOCKET] Received data:', {
					timestamp: data.timestamp,
					personsDetected: data.persons_detected,
					tablesCount: data.table_status?.length,
				});

				if (data.error) {
					console.error('❌ [WEBSOCKET] Error from server:', data.error);
					setError(data.error);
					setConnectionStatus('error');
					return;
				}

				setDetectionData(data);
				setConnectionStatus('connected');

				// Call parent callback to update table status in App state
				if (onDetectionUpdate && data.table_status) {
					console.log(
						'🔄 [WEBSOCKET] Calling onDetectionUpdate with table_status'
					);
					onDetectionUpdate(data);
				}
			} catch (err) {
				console.error('❌ [WEBSOCKET] Failed to parse message:', err);
			}
		};

		ws.onerror = (error) => {
			console.error('❌ [WEBSOCKET] Connection error:', error);
			setConnectionStatus('error');
			setError('Connection error. Retrying...');
		};

		ws.onclose = () => {
			console.log('🔌 [WEBSOCKET] Connection closed');
			setConnectionStatus('disconnected');

			// Auto-reconnect if detection is still active
			if (isDetecting) {
				console.log('🔄 [WEBSOCKET] Will attempt to reconnect in 3 seconds...');
				reconnectTimeoutRef.current = setTimeout(() => {
					console.log('🔄 [WEBSOCKET] Reconnecting...');
					connectWebSocket();
				}, 3000);
			}
		};

		wsRef.current = ws;
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
						🎥 Real-Time Detection (Auto-Started)
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
			<div className='bg-blue-50 border-l-4 border-blue-500 p-4 mb-4'>
				<div className='flex items-center gap-2'>
					<div className='animate-pulse w-3 h-3 bg-blue-500 rounded-full'></div>
					<div>
						<p className='text-blue-700 font-semibold'>
							Auto-Detection Mode Active
						</p>
						<p className='text-blue-600 text-sm'>
							Detection started automatically with server. Monitoring{' '}
							{tables?.length || 0} tables with{' '}
							{detectionData?.persons_detected || 0} persons detected.
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
						Last update: {new Date(detectionData.timestamp).toLocaleString()}
					</div>
				</div>
			)}

			{!detectionData && connectionStatus === 'connected' && (
				<div className='text-center py-8 text-gray-500'>
					<RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2' />
					<p>Waiting for detection data...</p>
					<p className='text-xs mt-2'>Detection runs every 1 second</p>
				</div>
			)}

			{!isDetecting && connectionStatus === 'disconnected' && (
				<div className='text-center py-8 text-gray-500'>
					<RefreshCw className='w-8 h-8 animate-spin mx-auto mb-2' />
					<p>Connecting to detection service...</p>
				</div>
			)}
		</div>
	);
};

export default RealtimeDetection;
