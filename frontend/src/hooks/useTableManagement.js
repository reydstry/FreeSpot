import { useState } from 'react';

export const useTableManagement = (
	localTables,
	setLocalTables,
	onAddTable,
	onUpdateTable,
	onDeleteTable,
	selectedTable,
	setSelectedTable,
	setFilterFloor
) => {
	const [showAddTablePopup, setShowAddTablePopup] = useState(false);
	const [newTableNumber, setNewTableNumber] = useState('');
	const [newTableCapacity, setNewTableCapacity] = useState('4');
	const [newTableFloor, setNewTableFloor] = useState('');

	const [showEditTablePopup, setShowEditTablePopup] = useState(false);
	const [editingTable, setEditingTable] = useState(null);
	const [editTableNumber, setEditTableNumber] = useState('');
	const [editTableCapacity, setEditTableCapacity] = useState('');

	const floors = [
		...new Set(localTables.map((t) => t.floor).filter((f) => f !== undefined)),
	].sort((a, b) => a - b);

	const handleAddTableButton = () => {
		const defaultFloor = (floors[0]).toString();
		setNewTableFloor(defaultFloor);

		const floorNum = parseInt(defaultFloor);
		const floorTables = localTables.filter((t) => t.floor === floorNum);
		const tableNumber = floorTables.length + 1;
		setNewTableNumber(tableNumber.toString());

		setShowAddTablePopup(true);
	};

	const handleConfirmAddTable = () => {
		if (
			!newTableNumber ||
			isNaN(newTableNumber) ||
			parseInt(newTableNumber) <= 0
		) {
			alert('⚠️ Nomor meja harus berupa angka positif');
			return;
		}

		if (
			!newTableCapacity ||
			isNaN(newTableCapacity) ||
			parseInt(newTableCapacity) <= 0
		) {
			alert('⚠️ Kapasitas harus berupa angka positif');
			return;
		}

		const floorNum = parseInt(newTableFloor);
		const tableNum = parseInt(newTableNumber);

		// Check if table number already exists on the same floor
		const existingTable = localTables.find(
			(t) => t.floor === floorNum && t.name === `Meja ${tableNum}`
		);

		if (existingTable) {
			alert(`⚠️ Nomor meja ${tableNum} sudah ada di Lantai ${floorNum}!`);
			return;
		}

		const newTable = {
			name: `Meja ${tableNum}`,
			status: 'tersedia',
			capacity: parseInt(newTableCapacity),
			floor: floorNum,
			coords: [100, 100, 200, 200],
		};

		const addedTable = onAddTable(newTable);
		setLocalTables((prev) => [...prev, addedTable]);

		setShowAddTablePopup(false);
		setNewTableNumber('');
		setNewTableCapacity('4');
		setNewTableFloor('');

		setFilterFloor(newTableFloor);
	};

	const handleEditTable = (table) => {
		setEditingTable(table);
		// Extract number from table name (e.g., "Meja 5" -> "5")
		const match = table.name.match(/\d+$/);
		if (match) {
			setEditTableNumber(match[0]);
		} else {
			setEditTableNumber('1');
		}
		setEditTableCapacity(table.capacity.toString());
		setShowEditTablePopup(true);
	};

	const handleConfirmEditTable = () => {
		if (
			!editTableNumber ||
			isNaN(editTableNumber) ||
			parseInt(editTableNumber) <= 0
		) {
			alert('⚠️ Nomor meja harus berupa angka positif');
			return;
		}

		if (
			!editTableCapacity ||
			isNaN(editTableCapacity) ||
			parseInt(editTableCapacity) <= 0
		) {
			alert('⚠️ Kapasitas harus berupa angka positif');
			return;
		}

		const tableNum = parseInt(editTableNumber);
		const fullTableName = `Meja ${tableNum}`;

		// Check if table number already exists on the same floor (excluding current table)
		const existingTable = localTables.find(
			(t) =>
				t.floor === editingTable.floor &&
				t.name === fullTableName &&
				t.id !== editingTable.id
		);

		if (existingTable) {
			alert(
				`⚠️ Nomor meja ${tableNum} sudah ada di Lantai ${editingTable.floor}!`
			);
			return;
		}

		onUpdateTable(editingTable.id, {
			name: fullTableName,
			capacity: parseInt(editTableCapacity),
		});

		setLocalTables((prev) =>
			prev.map((t) =>
				t.id === editingTable.id
					? {
							...t,
							name: fullTableName,
							capacity: parseInt(editTableCapacity),
						}
					: t
			)
		);

		setShowEditTablePopup(false);
		setEditingTable(null);
		setEditTableNumber('');
		setEditTableCapacity('');
	};

	const handleDeleteTable = (tableId) => {
		if (confirm('Hapus meja ini?')) {
			onDeleteTable(tableId);
			setLocalTables((prev) => prev.filter((t) => t.id !== tableId));
			if (selectedTable?.id === tableId) {
				setSelectedTable(null);
			}
		}
	};

	return {
		// Add Table
		showAddTablePopup,
		setShowAddTablePopup,
		newTableNumber,
		setNewTableNumber,
		newTableCapacity,
		setNewTableCapacity,
		newTableFloor,
		setNewTableFloor,
		handleAddTableButton,
		handleConfirmAddTable,

		// Edit Table
		showEditTablePopup,
		setShowEditTablePopup,
		editingTable,
		editTableNumber,
		setEditTableNumber,
		editTableCapacity,
		setEditTableCapacity,
		handleEditTable,
		handleConfirmEditTable,

		// Delete Table
		handleDeleteTable,

		// Floors
		floors,
	};
};
