import { useState } from 'react';

export const useCanvasInteractions = (
	canvasRef,
	canvasSize,
	filteredTables,
	filterFloor,
	localTables,
	setLocalTables,
	onAddTable,
	onUpdateTable
) => {
	const [selectedTable, setSelectedTable] = useState(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const [resizeHandle, setResizeHandle] = useState(null);
	const [dragStart, setDragStart] = useState(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [currentRect, setCurrentRect] = useState(null);

	const handleCanvasMouseDown = (e) => {
		if (filterFloor === 'all') return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const scaleX = canvasSize.width / rect.width;
		const scaleY = canvasSize.height / rect.height;
		const actualX = x * scaleX;
		const actualY = y * scaleY;

		const handleSize = 10;

		// Check if clicking on resize handle of selected table
		if (selectedTable && selectedTable.coords) {
			const [x1, y1, x2, y2] = selectedTable.coords;

			// Check corners (resize handles)
			if (
				Math.abs(actualX - x1) <= handleSize &&
				Math.abs(actualY - y1) <= handleSize
			) {
				setIsResizing(true);
				setResizeHandle('tl');
				setDragStart({ x: actualX, y: actualY, origCoords: [x1, y1, x2, y2] });
				return;
			}
			if (
				Math.abs(actualX - x2) <= handleSize &&
				Math.abs(actualY - y1) <= handleSize
			) {
				setIsResizing(true);
				setResizeHandle('tr');
				setDragStart({ x: actualX, y: actualY, origCoords: [x1, y1, x2, y2] });
				return;
			}
			if (
				Math.abs(actualX - x1) <= handleSize &&
				Math.abs(actualY - y2) <= handleSize
			) {
				setIsResizing(true);
				setResizeHandle('bl');
				setDragStart({ x: actualX, y: actualY, origCoords: [x1, y1, x2, y2] });
				return;
			}
			if (
				Math.abs(actualX - x2) <= handleSize &&
				Math.abs(actualY - y2) <= handleSize
			) {
				setIsResizing(true);
				setResizeHandle('br');
				setDragStart({ x: actualX, y: actualY, origCoords: [x1, y1, x2, y2] });
				return;
			}
		}

		// Check if clicking on existing table
		const clickedTable = filteredTables.find((table) => {
			if (!table.coords) return false;
			const [x1, y1, x2, y2] = table.coords;
			return actualX >= x1 && actualX <= x2 && actualY >= y1 && actualY <= y2;
		});

		if (clickedTable) {
			setSelectedTable(clickedTable);
			setIsDragging(true);
			setDragStart({ x: actualX, y: actualY });
		} else {
			// Clear selection when clicking empty area
			setSelectedTable(null);
			setIsDrawing(true);
			setCurrentRect({ x: actualX, y: actualY, width: 0, height: 0 });
		}
	};

	const handleCanvasMouseMove = (e) => {
		if (filterFloor === 'all') return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const scaleX = canvasSize.width / rect.width;
		const scaleY = canvasSize.height / rect.height;
		const actualX = x * scaleX;
		const actualY = y * scaleY;

		if (isResizing && selectedTable && dragStart && dragStart.origCoords) {
			const [origX1, origY1, origX2, origY2] = dragStart.origCoords;
			const dx = actualX - dragStart.x;
			const dy = actualY - dragStart.y;

			let newCoords = [origX1, origY1, origX2, origY2];

			switch (resizeHandle) {
				case 'tl':
					newCoords = [origX1 + dx, origY1 + dy, origX2, origY2];
					break;
				case 'tr':
					newCoords = [origX1, origY1 + dy, origX2 + dx, origY2];
					break;
				case 'bl':
					newCoords = [origX1 + dx, origY1, origX2, origY2 + dy];
					break;
				case 'br':
					newCoords = [origX1, origY1, origX2 + dx, origY2 + dy];
					break;
			}

			// Ensure minimum size
			if (
				Math.abs(newCoords[2] - newCoords[0]) > 30 &&
				Math.abs(newCoords[3] - newCoords[1]) > 30
			) {
				setLocalTables((prev) =>
					prev.map((t) =>
						t.id === selectedTable.id ? { ...t, coords: newCoords } : t
					)
				);
			}
		} else if (isDragging && selectedTable && dragStart) {
			const dx = actualX - dragStart.x;
			const dy = actualY - dragStart.y;

			setLocalTables((prev) =>
				prev.map((t) =>
					t.id === selectedTable.id && t.coords
						? {
								...t,
								coords: [
									t.coords[0] + dx,
									t.coords[1] + dy,
									t.coords[2] + dx,
									t.coords[3] + dy,
								],
							}
						: t
				)
			);

			setDragStart({ x: actualX, y: actualY });
		} else if (isDrawing && currentRect) {
			const width = actualX - currentRect.x;
			const height = actualY - currentRect.y;
			setCurrentRect({ ...currentRect, width, height });
		}

		// Change cursor based on hover position
		if (
			selectedTable &&
			selectedTable.coords &&
			!isDragging &&
			!isResizing &&
			!isDrawing
		) {
			const [x1, y1, x2, y2] = selectedTable.coords;
			const handleSize = 10;

			if (
				Math.abs(actualX - x1) <= handleSize &&
				Math.abs(actualY - y1) <= handleSize
			) {
				canvas.style.cursor = 'nwse-resize';
			} else if (
				Math.abs(actualX - x2) <= handleSize &&
				Math.abs(actualY - y1) <= handleSize
			) {
				canvas.style.cursor = 'nesw-resize';
			} else if (
				Math.abs(actualX - x1) <= handleSize &&
				Math.abs(actualY - y2) <= handleSize
			) {
				canvas.style.cursor = 'nesw-resize';
			} else if (
				Math.abs(actualX - x2) <= handleSize &&
				Math.abs(actualY - y2) <= handleSize
			) {
				canvas.style.cursor = 'nwse-resize';
			} else if (
				actualX >= x1 &&
				actualX <= x2 &&
				actualY >= y1 &&
				actualY <= y2
			) {
				canvas.style.cursor = 'move';
			} else {
				canvas.style.cursor = 'crosshair';
			}
		} else {
			canvas.style.cursor = 'crosshair';
		}
	};

	const handleCanvasMouseUp = (e) => {
		if (isDrawing && currentRect && filterFloor !== 'all') {
			const x1 = Math.min(currentRect.x, currentRect.x + currentRect.width);
			const y1 = Math.min(currentRect.y, currentRect.y + currentRect.height);
			const x2 = Math.max(currentRect.x, currentRect.x + currentRect.width);
			const y2 = Math.max(currentRect.y, currentRect.y + currentRect.height);

			if (Math.abs(x2 - x1) > 20 && Math.abs(y2 - y1) > 20) {
				const floorTables = localTables.filter(
					(t) => t.floor === parseInt(filterFloor)
				);
				const tableNumber = floorTables.length + 1;

				const newTable = {
					name: `Meja ${tableNumber}`,
					status: 'tersedia',
					capacity: 4,
					floor: parseInt(filterFloor),
					coords: [
						Math.round(x1),
						Math.round(y1),
						Math.round(x2),
						Math.round(y2),
					],
				};

				const addedTable = onAddTable(newTable);
				setLocalTables((prev) => [...prev, addedTable]);
			}
			setCurrentRect(null);
		}

		// Persist changes to parent when dragging or resizing ends
		if ((isDragging || isResizing) && selectedTable) {
			const updatedTable = localTables.find((t) => t.id === selectedTable.id);
			if (updatedTable && updatedTable.coords) {
				onUpdateTable(selectedTable.id, { coords: updatedTable.coords });
				// Update selectedTable to reflect the new coords
				setSelectedTable(updatedTable);
			}
		}

		setIsDrawing(false);
		setIsDragging(false);
		setIsResizing(false);
		setResizeHandle(null);
		setDragStart(null);
	};

	return {
		selectedTable,
		setSelectedTable,
		currentRect,
		isDrawing,
		handleCanvasMouseDown,
		handleCanvasMouseMove,
		handleCanvasMouseUp,
	};
};
