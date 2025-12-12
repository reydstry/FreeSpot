// WebSocket constants
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
export const WS_INITIAL_RECONNECT_DELAY = 5000;
export const WS_MAX_RECONNECT_DELAY = 60000;

// Polling intervals
export const TABLE_POLLING_INTERVAL = 2000;
export const WS_POLLING_INTERVAL = 100;

// Canvas & Animation
export const CANVAS_DEFAULT_WIDTH = 1280;
export const CANVAS_DEFAULT_HEIGHT = 720;
export const CANVAS_FPS_THROTTLE = 66;

// Table overlay colors
export const TABLE_COLORS = {
	available: {
		stroke: 'rgba(34, 197, 94, 0.9)',
		fill: 'rgba(34, 197, 94, 0.15)',
		text: '#22c55e',
	},
	occupied: {
		stroke: 'rgba(239, 68, 68, 0.9)',
		fill: 'rgba(239, 68, 68, 0.15)',
		text: '#ef4444',
	},
	reserved: {
		stroke: 'rgba(245, 196, 20, 0.9)',
		fill: 'rgba(245, 196, 20, 0.15)',
		text: '#f5c414',
	},
};

// Table frame minimum size
export const TABLE_MIN_SIZE = 30;
export const TABLE_HANDLE_SIZE = 10;
export const TABLE_ROTATE_HANDLE_DISTANCE = 30;

// API refresh delays
export const CCTV_LOAD_DELAY = 300; // Delay to ensure loading state is visible

// Default values
export const DEFAULT_TABLE_CAPACITY = 4;
export const DEFAULT_TABLE_STATUS = 'available';

// Status mapping for filtering
export const STATUS_MAP = {
	tersedia: ['tersedia', 'available'],
	terpakai: ['terpakai', 'occupied'],
	reservasi: ['reservasi', 'reserved'],
};
