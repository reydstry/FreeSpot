import React, {
	useMemo,
	useState,
	useEffect,
	useRef,
	useCallback,
} from 'react';
import SummaryCards from '../components/TablePage/SummaryCards';
import CctvPanel from '../components/TablePage/CctvPanel';
import TableFilter from '../components/TablePage/TableFilter';
import TableCard from '../components/TablePage/TableCard';
import RealtimeDetection from '../components/TablePage/RealtimeDetection';
import { cctvAPI, API_BASE_URL } from '../services/api';
import ResponsiveWrapper from '../context/ResponsiveWrapper';

const TablePage = ({ tables, floors, onStatusChange }) => {
	const [activeFilter, setActiveFilter] = useState('all');
	const [selectedFloor, setSelectedFloor] = useState('all');
	const [cctvSelectedFloor, setCctvSelectedFloor] = useState('1');

	// ⚡ Tambahkan canvasRef untuk RealtimeDetection
	const canvasRef = useRef(null);

	// WebSocket connections for all floors
	const wsConnectionsRef = useRef({});

	// Load CCTV feeds dari database
	const [cctvFeeds, setCctvFeeds] = useState({});
	const [isLoadingCctv, setIsLoadingCctv] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	// Load CCTV streams from database
	const loadCctvStreams = async () => {
		try {
			setIsLoadingCctv(true);
			const streams = await cctvAPI.getAll();

			// Convert DB streams to feeds format grouped by floor number
			const feedsByFloor = {};
			const timestamp = Date.now();

			floors.forEach((floor) => {
				const floorStreams = streams.filter(
					(s) => s.floor_id === floor.id && s.is_active
				);
				// Add timestamp to force refresh and prevent cache
				feedsByFloor[floor.number] = floorStreams.map((s) => {
					const url = s.url;
					const separator = url.includes('?') ? '&' : '?';
					return `${url}${separator}_t=${timestamp}`;
				});
			});

			setCctvFeeds(feedsByFloor);
			// Increment refresh key to force re-render video elements
			setRefreshKey((prev) => prev + 1);
			console.log('✅ CCTV feeds loaded:', feedsByFloor);
		} catch (error) {
			console.error('Error loading CCTV streams:', error);
			// Fallback to localStorage if DB fails
			try {
				const stored = localStorage.getItem('freespot_cctv_settings');
				if (stored) {
					const parsed = JSON.parse(stored);
					setCctvFeeds(parsed);
				}
			} catch (e) {
				console.error('Error loading from localStorage:', e);
			}
		} finally {
			setIsLoadingCctv(false);
		}
	};

	useEffect(() => {
		loadCctvStreams();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [floors.length]);

	// Listen for CCTV updates from Settings page
	useEffect(() => {
		const handleCctvUpdate = () => {
			console.log('🔄 CCTV updated, reloading...');
			loadCctvStreams();
		};

		window.addEventListener('cctv-updated', handleCctvUpdate);
		return () => {
			window.removeEventListener('cctv-updated', handleCctvUpdate);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Get floors from props (DB) or fallback to unique floors from tables
	const floorsList = useMemo(() => {
		if (floors && floors.length > 0) {
			return floors.map((f) => f.number).sort((a, b) => a - b);
		}
		// Fallback: extract from tables
		return [
			...new Set(tables.map((t) => t.floor).filter((f) => f !== undefined)),
		].sort((a, b) => a - b);
	}, [floors, tables]);

	// Dynamic floor options untuk CCTV (hanya lantai yang ada)
	const cctvFloorOptions = useMemo(() => {
		return floorsList.map((floor) => ({
			value: floor.toString(),
			label: `Lantai ${floor}`,
		}));
	}, [floorsList]);

	// Set default CCTV floor jika belum ada
	useEffect(() => {
		if (
			floorsList.length > 0 &&
			!floorsList.includes(parseInt(cctvSelectedFloor))
		) {
			setCctvSelectedFloor(floorsList[0].toString());
		}
	}, [floorsList, cctvSelectedFloor]);

	// Filter tables by status and floor
	let filteredTables = tables;

	if (activeFilter !== 'all') {
		// Support both old (tersedia/terpakai/reservasi) and new (available/occupied/reserved) status
		const statusMap = {
			tersedia: ['tersedia', 'available'],
			terpakai: ['terpakai', 'occupied'],
			reservasi: ['reservasi', 'reserved'],
		};
		const matchStatuses = statusMap[activeFilter] || [activeFilter];
		filteredTables = filteredTables.filter((t) =>
			matchStatuses.includes(t.status)
		);
	}

	if (selectedFloor !== 'all') {
		filteredTables = filteredTables.filter(
			(t) => t.floor === parseInt(selectedFloor)
		);
	}

	const cctvFeedsByFloor = cctvFeeds;

	// Get current floor object for RealtimeDetection
	const currentFloor = useMemo(() => {
		if (!floors || floors.length === 0) return null;
		const floorNum = parseInt(selectedFloor);
		return floors.find((f) => f.number === floorNum);
	}, [floors, selectedFloor]);

	// Get tables for current floor
	const currentFloorTables = useMemo(() => {
		if (selectedFloor === 'all') return tables;
		return tables.filter((t) => t.floor === parseInt(selectedFloor));
	}, [tables, selectedFloor]);

	// Handle detection updates
	const handleDetectionUpdate = useCallback(
		(detectionData) => {
			// Update table status based on real-time detection
			if (detectionData && detectionData.table_status) {
				console.log(
					'🔄 [DETECTION UPDATE] Updating table status from detection'
				);

				// ⚡ Properly convert to array
				const tableStatusArray = Array.isArray(detectionData.table_status)
					? detectionData.table_status
					: Object.values(detectionData.table_status);

				tableStatusArray.forEach((tableStatus) => {
					const newStatus = tableStatus.occupied ? 'occupied' : 'available';
					console.log(
						`   Table ${tableStatus.id}: ${newStatus} (method: ${tableStatus.method})`
					);
					// Pass skipApiUpdate flag to prevent API sync (DB already updated by backend)
					onStatusChange(tableStatus.id, newStatus, true);
				});
			}
		},
		[onStatusChange]
	);

	// Connect WebSocket for ALL floors to receive real-time updates
	useEffect(() => {
		if (!floors || floors.length === 0) return;

		const connectToFloor = (floorId) => {
			if (wsConnectionsRef.current[floorId]) return; // Already connected

			// Convert HTTP(S) to WS(S) properly
			let wsUrl = API_BASE_URL;
			if (wsUrl.startsWith('https://')) {
				wsUrl = wsUrl.replace('https://', 'wss://');
			} else if (wsUrl.startsWith('http://')) {
				wsUrl = wsUrl.replace('http://', 'ws://');
			}
			const fullWsUrl = `${wsUrl}/ws/detection/${floorId}`;

			console.log(`🔌 [WS] Connecting to floor ${floorId}:`, fullWsUrl);

			const ws = new WebSocket(fullWsUrl);

			ws.onopen = () => {
				console.log(`✅ [WS] Connected to floor ${floorId}`);
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data && data.table_status) {
						console.log(
							`📨 [WS] Floor ${floorId}: ${data.persons_detected} persons`
						);
						handleDetectionUpdate(data);
					}
				} catch (err) {
					console.error(`❌ [WS] Parse error floor ${floorId}:`, err);
				}
			};

			ws.onerror = (error) => {
				console.error(`❌ [WS] Error floor ${floorId}:`, error);
			};

			ws.onclose = () => {
				console.log(`🔌 [WS] Disconnected from floor ${floorId}`);
				delete wsConnectionsRef.current[floorId];
				// Auto-reconnect after 3 seconds
				setTimeout(() => connectToFloor(floorId), 3000);
			};

			wsConnectionsRef.current[floorId] = ws;
		};

		// Connect to all floors
		floors.forEach((floor) => {
			connectToFloor(floor.id);
		});

		// Cleanup on unmount
		return () => {
			Object.values(wsConnectionsRef.current).forEach((ws) => {
				if (ws && ws.readyState === WebSocket.OPEN) {
					ws.close();
				}
			});
			wsConnectionsRef.current = {};
		};
	}, [floors, handleDetectionUpdate]);

	return (
		<ResponsiveWrapper>
			<div>
				{/* Real-time Detection Panel - show detection info for selected floor */}
				{currentFloor && selectedFloor !== 'all' && (
					<RealtimeDetection
						floor={currentFloor}
						tables={currentFloorTables}
						canvasRef={canvasRef}
						onDetectionUpdate={handleDetectionUpdate}
					/>
				)}

				{/* CCTV di atas summary */}
				<CctvPanel
					key={refreshKey}
					feedsByFloor={cctvFeedsByFloor}
					floorOptions={cctvFloorOptions}
					floorValue={cctvSelectedFloor}
					onFloorChange={setCctvSelectedFloor}
					onRefresh={loadCctvStreams}
					isLoading={isLoadingCctv}
					floors={floors}
					tables={tables}
				/>
				<SummaryCards tables={tables} />

				<div>
					<h2 className='text-2xl font-bold text-primary mb-4'>Status Meja</h2>
					<TableFilter
						activeFilter={activeFilter}
						setActiveFilter={setActiveFilter}
						selectedFloor={selectedFloor}
						setSelectedFloor={setSelectedFloor}
						tables={tables}
						floors={floors}
					/>{' '}
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
						{filteredTables.length > 0 ? (
							filteredTables.map((table) => (
								<TableCard
									key={table.id}
									table={table}
									onStatusChange={onStatusChange}
								/>
							))
						) : (
							<div className='col-span-full flex items-center justify-center py-16'>
								<div className='text-center'>
									<div className='text-6xl mb-4 opacity-50'>📋</div>
									<p className='text-gray-500 text-lg'>
										Tidak ada meja yang sesuai dengan filter
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</ResponsiveWrapper>
	);
};

export default TablePage;
