import React, { useState, useRef, useEffect } from 'react';
import FloorCanvas from '../components/EditLayout/FloorCanvas';
import TableSidebar from '../components/EditLayout/TableSidebar';
import AddTableModal from '../components/PopUp/AddTablePopUp';
import EditTableModal from '../components/PopUp/EditTablePopUp';
import FilterModal from '../components/PopUp/FilterPopUp';
import EditFloorModal from '../components/PopUp/EditFloorPopUp';
import ToolbarActions from '../components/EditLayout/ToolbarActions';
import { useCanvasInteractions, useTableManagement } from '../hooks';
import { showToast } from '../components/Toast/ToastContainer';
import ResponsiveWrapper from '../context/ResponsiveWrapper';

const EditLayoutPage = ({
	tables,
	floors,
	onAddTable,
	onUpdateTable,
	onDeleteTable,
	onAddFloor,
	onDeleteFloor,
}) => {
	const [localTables, setLocalTables] = useState(tables);
	const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });
	const [videoFrame, setVideoFrame] = useState(null);
	const [uploadedFileName, setUploadedFileName] = useState('');
	const [showEditFloorModal, setShowEditFloorModal] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [showFilterPopup, setShowFilterPopup] = useState(false);
	const [filterCapacity, setFilterCapacity] = useState('all');

	// Set default filterFloor based on first available floor
	const [filterFloor, setFilterFloor] = useState(() => {
		const floorNumbers =
			floors && floors.length > 0
				? floors.map((f) => f.number).sort((a, b) => a - b)
				: [];
		return floorNumbers.length > 0 ? floorNumbers[0].toString() : '1';
	});

	const [sortOrder, setSortOrder] = useState('none');
	// Temporary filter states for modal
	const [tempFilterCapacity, setTempFilterCapacity] = useState('all');
	const [tempFilterFloor, setTempFilterFloor] = useState(() => {
		const floorNumbers =
			floors && floors.length > 0
				? floors.map((f) => f.number).sort((a, b) => a - b)
				: [];
		return floorNumbers.length > 0 ? floorNumbers[0].toString() : '1';
	});
	const [tempSortOrder, setTempSortOrder] = useState('none');
	const canvasRef = useRef(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	// First filter by main floor dropdown for canvas display
	const filteredTables = localTables.filter(
		(t) => t.floor === parseInt(filterFloor)
	);

	// Canvas interactions hook
	const {
		selectedTable,
		setSelectedTable,
		currentRect,
		isDrawing,
		handleCanvasMouseDown,
		handleCanvasMouseMove,
		handleCanvasMouseUp,
	} = useCanvasInteractions(
		canvasRef,
		canvasSize,
		filteredTables,
		filterFloor,
		localTables,
		setLocalTables,
		onAddTable,
		onUpdateTable,
		floors
	);

	// Table management hook
	const {
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
		showEditTablePopup,
		setShowEditTablePopup,
		editingTable,
		editTableNumber,
		setEditTableNumber,
		editTableCapacity,
		setEditTableCapacity,
		handleEditTable,
		handleConfirmEditTable,
		handleDeleteTable,
	} = useTableManagement(
		localTables,
		setLocalTables,
		onAddTable,
		onUpdateTable,
		onDeleteTable,
		selectedTable,
		setSelectedTable,
		setFilterFloor,
		floors
	);

	useEffect(() => {
		setCanvasSize({ width: 1280, height: 720 });
	}, [filterFloor]);

	// Extract floor numbers from floors array for compatibility with existing components
	const floorNumbers =
		floors && floors.length > 0
			? floors.map((f) => (typeof f === 'object' ? f.number : f))
			: [];

	// Only sync when table count changes (add/delete), not on updates
	useEffect(() => {
		if (tables.length !== localTables.length) {
			setLocalTables(tables);
		}
	}, [tables.length, localTables.length]);

	// Keyboard event for delete
	useEffect(() => {
		const handleKeyDown = (e) => {
			if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTable) {
				// Check if not typing in input field
				if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
					e.preventDefault();
					handleDeleteTable(selectedTable.id);
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [selectedTable, handleDeleteTable]);

	// Apply search and additional filters for sidebar display
	const displayedTables = localTables
		.filter((table) => {
			// Search by name
			if (
				searchQuery &&
				!table.name.toLowerCase().includes(searchQuery.toLowerCase())
			) {
				return false;
			}

			// Filter by capacity (from modal)
			if (filterCapacity && filterCapacity !== 'all') {
				if (table.capacity !== parseInt(filterCapacity)) {
					return false;
				}
			}

			// Filter by floor
			if (table.floor !== parseInt(filterFloor)) {
				return false;
			}

			return true;
		})
		.sort((a, b) => {
			// Extract table numbers from names (e.g., "Meja 5" -> 5)
			const extractNumber = (name) => {
				const match = name.match(/\d+$/);
				return match ? parseInt(match[0]) : 0;
			};

			const numA = extractNumber(a.name);
			const numB = extractNumber(b.name);

			// Apply sorting based on sortOrder
			if (sortOrder === 'asc') {
				return numA - numB;
			} else if (sortOrder === 'desc') {
				return numB - numA;
			}

			// Default: sort by table number
			return numA - numB;
		});

	const handleVideoUpload = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		setUploadedFileName(file.name);

		// Check if file is image or video
		const fileType = file.type.split('/')[0];

		if (fileType === 'image') {
			// Handle image file
			const img = new Image();
			img.src = URL.createObjectURL(file);
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);

				setVideoFrame(canvas.toDataURL());
				setCanvasSize({ width: img.width, height: img.height });
				URL.revokeObjectURL(img.src);
			};
		} else if (fileType === 'video') {
			// Handle video file
			const video = document.createElement('video');
			video.src = URL.createObjectURL(file);
			video.onloadeddata = () => {
				video.currentTime = 0;
				video.onseeked = () => {
					const canvas = document.createElement('canvas');
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					const ctx = canvas.getContext('2d');
					ctx.drawImage(video, 0, 0);

					setVideoFrame(canvas.toDataURL());
					setCanvasSize({ width: video.videoWidth, height: video.videoHeight });
					URL.revokeObjectURL(video.src);
				};
			};
		}
	};

	const handleAddFloor = async (floorNum) => {
		try {
			// Create floor di DB
			const floorData = { name: `Lantai ${floorNum}`, number: floorNum };
			const createdFloor = await onAddFloor(floorData);

			console.log('✅ Floor created:', createdFloor);

			setFilterFloor(floorNum.toString());
			showToast(
				`Lantai ${floorNum} berhasil ditambahkan! Silakan tambahkan meja.`,
				'success'
			);
		} catch (error) {
			console.error('❌ Failed to add floor:', error);
			showToast(`Gagal menambah lantai ${floorNum}: ${error.message}`, 'error');
		}
	};

	const handleDeleteFloor = async (floorNum) => {
		try {
			// Get floor object from floors array
			const floorObj = floors.find((f) => f.number === floorNum);
			if (!floorObj) {
				showToast(`Lantai ${floorNum} tidak ditemukan`, 'error');
				return;
			}

			// Validasi: minimal harus ada 1 floor
			if (floors.length <= 1) {
				showToast('Tidak bisa menghapus! Minimal harus ada 1 lantai.', 'error');
				return;
			}

			// Delete all tables on this floor
			const tablesToDelete = localTables.filter((t) => t.floor === floorNum);
			for (const table of tablesToDelete) {
				await onDeleteTable(table.id);
			}
			setLocalTables((prev) => prev.filter((t) => t.floor !== floorNum));

			// Delete floor dari DB
			await onDeleteFloor(floorObj.id);

			// Switch to another floor if current floor is deleted
			if (parseInt(filterFloor) === floorNum) {
				const remainingFloors = floors
					.filter((f) => f.number !== floorNum)
					.map((f) => f.number);
				if (remainingFloors.length > 0) {
					setFilterFloor(remainingFloors[0].toString());
				} else {
					setFilterFloor('1');
				}
			}

			showToast(`Lantai ${floorNum} berhasil dihapus!`, 'success');
		} catch (error) {
			console.error('Failed to delete floor:', error);
			showToast(`Gagal menghapus lantai ${floorNum}`, 'error');
		}
	};

	const handleOpenFilterPopup = () => {
		// Initialize temp states with current filter values
		setTempFilterCapacity(filterCapacity);
		setTempFilterFloor(filterFloor);
		setTempSortOrder(sortOrder);
		setShowFilterPopup(true);
	};

	const handleApplyFilters = () => {
		// Apply temp filters to actual filters
		setFilterCapacity(tempFilterCapacity);
		setFilterFloor(tempFilterFloor);
		setSortOrder(tempSortOrder);
		setShowFilterPopup(false);
	};

	const handleResetFilters = () => {
		const firstFloor = floors[0] || '1';
		setTempFilterCapacity('all');
		setTempFilterFloor(firstFloor.toString());
		setTempSortOrder('none');
	};

	const toggleFullscreen = () => {
		setIsFullscreen(!isFullscreen);
	};

	return (
		<ResponsiveWrapper>
			<div>
				<h2 className='text-3xl font-bold text-primary mb-4'>Setup Meja</h2>
				<ToolbarActions
					onVideoUpload={handleVideoUpload}
					onAddTable={handleAddTableButton}
					onEditFloor={() => setShowEditFloorModal(true)}
					uploadedFileName={uploadedFileName}
					onToggleFullscreen={toggleFullscreen}
					isFullscreen={isFullscreen}
				/>
				<div className='flex flex-col lg:flex-row gap-6'>
					<FloorCanvas
						canvasRef={canvasRef}
						canvasSize={canvasSize}
						videoFrame={videoFrame}
						filteredTables={filteredTables}
						selectedTable={selectedTable}
						currentRect={currentRect}
						isDrawing={isDrawing}
						filterFloor={filterFloor}
						onCanvasMouseDown={handleCanvasMouseDown}
						onCanvasMouseMove={handleCanvasMouseMove}
						onCanvasMouseUp={handleCanvasMouseUp}
						isFullscreen={isFullscreen}
						onToggleFullscreen={toggleFullscreen}
					/>{' '}
					<TableSidebar
						displayedTables={displayedTables}
						selectedTable={selectedTable}
						searchQuery={searchQuery}
						filterCapacity={filterCapacity}
						filterFloor={filterFloor}
						sortOrder={sortOrder}
						onSearchChange={setSearchQuery}
						onFilterClick={handleOpenFilterPopup}
						onTableSelect={setSelectedTable}
						onEditTable={handleEditTable}
						onDeleteTable={handleDeleteTable}
					/>
				</div>
				<FilterModal
					isOpen={showFilterPopup}
					onClose={() => setShowFilterPopup(false)}
					filterCapacity={tempFilterCapacity}
					filterFloor={tempFilterFloor}
					sortOrder={tempSortOrder}
					floors={floorNumbers}
					onFilterCapacityChange={setTempFilterCapacity}
					onFilterFloorChange={setTempFilterFloor}
					onSortOrderChange={setTempSortOrder}
					onReset={handleResetFilters}
					onApply={handleApplyFilters}
				/>
				<AddTableModal
					isOpen={showAddTablePopup}
					onClose={() => setShowAddTablePopup(false)}
					tableNumber={newTableNumber}
					tableCapacity={newTableCapacity}
					tableFloor={newTableFloor}
					floors={floorNumbers}
					onTableNumberChange={setNewTableNumber}
					onTableCapacityChange={setNewTableCapacity}
					onTableFloorChange={setNewTableFloor}
					onConfirm={handleConfirmAddTable}
				/>
				<EditTableModal
					isOpen={showEditTablePopup}
					onClose={() => setShowEditTablePopup(false)}
					table={editingTable}
					tableNumber={editTableNumber}
					tableCapacity={editTableCapacity}
					onTableNumberChange={setEditTableNumber}
					onTableCapacityChange={setEditTableCapacity}
					onConfirm={handleConfirmEditTable}
				/>
				<EditFloorModal
					isOpen={showEditFloorModal}
					onClose={() => setShowEditFloorModal(false)}
					floors={floors}
					onAddFloor={handleAddFloor}
					onDeleteFloor={handleDeleteFloor}
				/>
			</div>
		</ResponsiveWrapper>
	);
};

export default EditLayoutPage;