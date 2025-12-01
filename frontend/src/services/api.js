// API Base URL Configuration
export const API_BASE_URL =
	import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ========================================
// FLOORS API
// ========================================

export const floorsAPI = {
	// Get all floors
	async getAll() {
		const response = await fetch(`${API_BASE_URL}/floors`);
		if (!response.ok) throw new Error('Failed to fetch floors');
		return response.json();
	},

	// Create new floor
	async create(floorData) {
		const response = await fetch(`${API_BASE_URL}/floors`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(floorData),
		});
		if (!response.ok) throw new Error('Failed to create floor');
		return response.json();
	},

	// Delete floor
	async delete(floorId) {
		const response = await fetch(`${API_BASE_URL}/floors/${floorId}`, {
			method: 'DELETE',
		});
		if (!response.ok) throw new Error('Failed to delete floor');
		return response.json();
	},
};

// ========================================
// TABLES API
// ========================================

export const tablesAPI = {
	// Get all tables or filter by floor
	async getAll(floorId = null) {
		const url = floorId
			? `${API_BASE_URL}/tables?floor_id=${floorId}`
			: `${API_BASE_URL}/tables`;
		const response = await fetch(url);
		if (!response.ok) throw new Error('Failed to fetch tables');
		return response.json();
	},

	// Create new table
	async create(tableData) {
		const response = await fetch(`${API_BASE_URL}/tables`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(tableData),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('❌ API: Create table failed:', {
				status: response.status,
				detail: errorData.detail,
				tableData: tableData,
			});
			throw new Error(
				errorData.detail || `Failed to create table (${response.status})`
			);
		}

		const result = await response.json();
		return result;
	},

	// Update table
	async update(tableId, tableData) {
		const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(tableData),
		});
		if (!response.ok) throw new Error('Failed to update table');
		return response.json();
	},

	// Delete table
	async delete(tableId) {
		const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
			method: 'DELETE',
		});
		if (!response.ok) throw new Error('Failed to delete table');
		return response.json();
	},
};

// ========================================
// CCTV STREAMS API
// ========================================

export const cctvAPI = {
	// Get all CCTV streams or filter by floor
	async getAll(floorId = null) {
		const url = floorId
			? `${API_BASE_URL}/cctv-streams?floor_id=${floorId}`
			: `${API_BASE_URL}/cctv-streams`;
		const response = await fetch(url);
		if (!response.ok) throw new Error('Failed to fetch CCTV streams');
		return response.json();
	},

	// Create new CCTV stream
	async create(streamData) {
		const response = await fetch(`${API_BASE_URL}/cctv-streams`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(streamData),
		});
		if (!response.ok) throw new Error('Failed to create CCTV stream');
		return response.json();
	},

	// Update CCTV stream
	async update(streamId, streamData) {
		const response = await fetch(`${API_BASE_URL}/cctv-streams/${streamId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(streamData),
		});
		if (!response.ok) throw new Error('Failed to update CCTV stream');
		return response.json();
	},

	// Delete CCTV stream
	async delete(streamId) {
		const response = await fetch(`${API_BASE_URL}/cctv-streams/${streamId}`, {
			method: 'DELETE',
		});
		if (!response.ok) throw new Error('Failed to delete CCTV stream');
		return response.json();
	},
};

// ========================================
// DETECTION API
// ========================================

export const detectionAPI = {
	// Start detection for a floor
	async start(floorId) {
		const response = await fetch(`${API_BASE_URL}/detection/start/${floorId}`, {
			method: 'POST',
		});
		if (!response.ok) throw new Error('Failed to start detection');
		return response.json();
	},

	// Stop detection for a floor
	async stop(floorId) {
		const response = await fetch(`${API_BASE_URL}/detection/stop/${floorId}`, {
			method: 'POST',
		});
		if (!response.ok) throw new Error('Failed to stop detection');
		return response.json();
	},

	// Get detection status for all floors
	async getStatus() {
		const response = await fetch(`${API_BASE_URL}/detection/status`);
		if (!response.ok) throw new Error('Failed to fetch detection status');
		return response.json();
	},

	// WebSocket connection for real-time updates
	connectWebSocket(onMessage, floorId = null) {
		const base = API_BASE_URL.replace('http', 'ws');
		const wsUrl = floorId
			? `${base}/ws/detect?floor_id=${floorId}`
			: `${base}/ws/detect`;

		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			console.log('✅ WebSocket connected');
		};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			onMessage(data);
		};

		ws.onerror = (error) => {
			console.error('❌ WebSocket error:', error);
		};

		ws.onclose = () => {
			console.log('🔌 WebSocket disconnected');
		};

		return ws;
	},
};

// ========================================
// HEALTH CHECK
// ========================================

export const healthAPI = {
	async check() {
		try {
			const response = await fetch(`${API_BASE_URL}/health`);
			return response.ok;
		} catch (error) {
			return false;
		}
	},
};

export default {
	floorsAPI,
	tablesAPI,
	cctvAPI,
	detectionAPI,
	healthAPI,
	API_BASE_URL,
};
