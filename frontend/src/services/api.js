// Ensure API URL has protocol prefix
const getApiBaseUrl = () => {
	const envUrl = import.meta.env.VITE_API_BASE_URL;
	if (!envUrl) return 'http://localhost:8000';
	// Add https:// if no protocol is specified
	if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
		return `https://${envUrl}`;
	}
	return envUrl;
};

export const API_BASE_URL = getApiBaseUrl();

export const floorsAPI = {
	async getAll() {
		const response = await fetch(`${API_BASE_URL}/floors`);
		if (!response.ok) throw new Error('Failed to fetch floors');
		return response.json();
	},

	async create(floorData) {
		const response = await fetch(`${API_BASE_URL}/floors`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(floorData),
		});
		if (!response.ok) throw new Error('Failed to create floor');
		return response.json();
	},

	async delete(floorId) {
		const response = await fetch(`${API_BASE_URL}/floors/${floorId}`, {
			method: 'DELETE',
		});
		if (!response.ok) throw new Error('Failed to delete floor');
		return response.json();
	},
};

export const tablesAPI = {
	async getAll(floorId = null) {
		const url = floorId
			? `${API_BASE_URL}/tables?floor_id=${floorId}`
			: `${API_BASE_URL}/tables`;
		const response = await fetch(url);
		if (!response.ok) throw new Error('Failed to fetch tables');
		return response.json();
	},

	async create(tableData) {
		const response = await fetch(`${API_BASE_URL}/tables`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(tableData),
		});
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				errorData.detail || `Failed to create table (${response.status})`
			);
		}
		return response.json();
	},

	async update(tableId, tableData) {
		const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(tableData),
		});
		if (!response.ok) throw new Error('Failed to update table');
		return response.json();
	},

	async delete(tableId) {
		const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
			method: 'DELETE',
		});
		if (!response.ok) throw new Error('Failed to delete table');
		return response.json();
	},
};

export const cctvAPI = {
	async getAll(floorId = null) {
		const url = floorId
			? `${API_BASE_URL}/cctv-streams?floor_id=${floorId}`
			: `${API_BASE_URL}/cctv-streams`;
		const response = await fetch(url);
		if (!response.ok) throw new Error('Failed to fetch CCTV streams');
		return response.json();
	},

	async create(streamData) {
		const response = await fetch(`${API_BASE_URL}/cctv-streams`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(streamData),
		});
		if (!response.ok) throw new Error('Failed to create CCTV stream');
		return response.json();
	},

	async update(streamId, streamData) {
		const response = await fetch(`${API_BASE_URL}/cctv-streams/${streamId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(streamData),
		});
		if (!response.ok) throw new Error('Failed to update CCTV stream');
		return response.json();
	},

	async delete(streamId) {
		const response = await fetch(`${API_BASE_URL}/cctv-streams/${streamId}`, {
			method: 'DELETE',
		});
		if (!response.ok) throw new Error('Failed to delete CCTV stream');
		return response.json();
	},
};

export const detectionAPI = {
	async start(floorId) {
		const response = await fetch(`${API_BASE_URL}/detection/start/${floorId}`, {
			method: 'POST',
		});
		if (!response.ok) throw new Error('Failed to start detection');
		return response.json();
	},

	async stop(floorId) {
		const response = await fetch(`${API_BASE_URL}/detection/stop/${floorId}`, {
			method: 'POST',
		});
		if (!response.ok) throw new Error('Failed to stop detection');
		return response.json();
	},

	async getStatus() {
		const response = await fetch(`${API_BASE_URL}/detection/status`);
		if (!response.ok) throw new Error('Failed to fetch detection status');
		return response.json();
	},

	connectWebSocket(onMessage, floorId = null) {
		// Convert HTTP(S) to WS(S) properly
		let base = API_BASE_URL;
		if (base.startsWith('https://')) {
			base = base.replace('https://', 'wss://');
		} else if (base.startsWith('http://')) {
			base = base.replace('http://', 'ws://');
		}
		const wsUrl = floorId
			? `${base}/ws/detect?floor_id=${floorId}`
			: `${base}/ws/detect`;
		const ws = new WebSocket(wsUrl);
		ws.onmessage = (event) => onMessage(JSON.parse(event.data));
		return ws;
	},
};

export const healthAPI = {
	async check() {
		try {
			const response = await fetch(`${API_BASE_URL}/health`);
			return response.ok;
		} catch {
			return false;
		}
	},
};
