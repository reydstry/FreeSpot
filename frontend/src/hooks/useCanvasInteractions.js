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
	const [isRotating, setIsRotating] = useState(false);
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

		// Check if clicking on resize/rotate handle of selected table
		if (selectedTable && selectedTable.coords) {
			const [x1, y1, x2, y2] = selectedTable.coords;
			const centerX = (x1 + x2) / 2;
			const centerY = (y1 + y2) / 2;
			const width = x2 - x1;
			const height = y2 - y1;
			const rotation = selectedTable.rotation || 0;

			// Check rotate handle (above the center of the table)
			const rotateHandleDistance = 30;
			const rotateX = centerX;
			const rotateY = y1 - rotateHandleDistance;

			// Transform rotate handle position based on current rotation
			const cos = Math.cos(rotation);
			const sin = Math.sin(rotation);
			const dx = rotateX - centerX;
			const dy = rotateY - centerY;
			const rotatedRotateX = centerX + dx * cos - dy * sin;
			const rotatedRotateY = centerY + dx * sin + dy * cos;

			if (
				Math.abs(actualX - rotatedRotateX) <= handleSize &&
				Math.abs(actualY - rotatedRotateY) <= handleSize
			) {
				setIsRotating(true);
				setDragStart({
					x: actualX,
					y: actualY,
					origRotation: rotation,
					centerX,
					centerY,
				});
				return;
			}

			// Check corners (resize handles) - transform based on rotation
			const corners = [
				{ name: 'tl', lx: -width / 2, ly: -height / 2 },
				{ name: 'tr', lx: width / 2, ly: -height / 2 },
				{ name: 'bl', lx: -width / 2, ly: height / 2 },
				{ name: 'br', lx: width / 2, ly: height / 2 },
			];

			for (const corner of corners) {
				const worldX = centerX + corner.lx * cos - corner.ly * sin;
				const worldY = centerY + corner.lx * sin + corner.ly * cos;

				if (
					Math.abs(actualX - worldX) <= handleSize &&
					Math.abs(actualY - worldY) <= handleSize
				) {
					setIsResizing(true);
					setResizeHandle(corner.name);
					setDragStart({
						x: actualX,
						y: actualY,
						origCoords: [x1, y1, x2, y2],
						rotation,
						centerX,
						centerY,
					});
					return;
				}
			}
		}

		// Check if clicking on existing table (considering rotation)
		const clickedTable = filteredTables.find((table) => {
			if (!table.coords) return false;
			const [x1, y1, x2, y2] = table.coords;
			const centerX = (x1 + x2) / 2;
			const centerY = (y1 + y2) / 2;
			const rotation = table.rotation || 0;

			// Transform click coordinates to table's local space
			const dx = actualX - centerX;
			const dy = actualY - centerY;
			const cos = Math.cos(-rotation);
			const sin = Math.sin(-rotation);
			const localX = dx * cos - dy * sin;
			const localY = dx * sin + dy * cos;

			const width = x2 - x1;
			const height = y2 - y1;

			return (
				localX >= -width / 2 &&
				localX <= width / 2 &&
				localY >= -height / 2 &&
				localY <= height / 2
			);
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

		if (isRotating && selectedTable && dragStart) {
			const dx = actualX - dragStart.centerX;
			const dy = actualY - dragStart.centerY;
			const angle = Math.atan2(dy, dx);

			const startDx = dragStart.x - dragStart.centerX;
			const startDy = dragStart.y - dragStart.centerY;
			const startAngle = Math.atan2(startDy, startDx);

			let newRotation = dragStart.origRotation + (angle - startAngle);

			// Normalize rotation to 0-2π
			while (newRotation < 0) newRotation += Math.PI * 2;
			while (newRotation >= Math.PI * 2) newRotation -= Math.PI * 2;

			setLocalTables((prev) =>
				prev.map((t) =>
					t.id === selectedTable.id ? { ...t, rotation: newRotation } : t
				)
			);
		} else if (
			isResizing &&
			selectedTable &&
			dragStart &&
			dragStart.origCoords
		) {
			const [origX1, origY1, origX2, origY2] = dragStart.origCoords;

			// Transform mouse position to local space for resizing
			const rotation = dragStart.rotation || 0;
			const centerX = dragStart.centerX;
			const centerY = dragStart.centerY;

			const dx = actualX - centerX;
			const dy = actualY - centerY;
			const cos = Math.cos(-rotation);
			const sin = Math.sin(-rotation);
			const localX = centerX + dx * cos - dy * sin;
			const localY = centerY + dx * sin + dy * cos;

			const origWidth = origX2 - origX1;
			const origHeight = origY2 - origY1;
			const origCenterX = (origX1 + origX2) / 2;
			const origCenterY = (origY1 + origY2) / 2;

			let newCoords = [origX1, origY1, origX2, origY2];

			switch (resizeHandle) {
				case 'tl':
					newCoords = [localX, localY, origX2, origY2];
					break;
				case 'tr':
					newCoords = [origX1, localY, localX, origY2];
					break;
				case 'bl':
					newCoords = [localX, origY1, origX2, localY];
					break;
				case 'br':
					newCoords = [origX1, origY1, localX, localY];
					break;
			}

			// Ensure minimum size and normalize coordinates
			const minSize = 30;
			let [newX1, newY1, newX2, newY2] = newCoords;

			if (newX2 < newX1) [newX1, newX2] = [newX2, newX1];
			if (newY2 < newY1) [newY1, newY2] = [newY2, newY1];

			if (newX2 - newX1 >= minSize && newY2 - newY1 >= minSize) {
				setLocalTables((prev) =>
					prev.map((t) =>
						t.id === selectedTable.id
							? { ...t, coords: [newX1, newY1, newX2, newY2] }
							: t
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
			!isRotating &&
			!isDrawing
		) {
			const [x1, y1, x2, y2] = selectedTable.coords;
			const centerX = (x1 + x2) / 2;
			const centerY = (y1 + y2) / 2;
			const width = x2 - x1;
			const height = y2 - y1;
			const rotation = selectedTable.rotation || 0;
			const handleSize = 10;

			// Check rotate handle hover
			const rotateHandleDistance = 30;
			const rotateX = centerX;
			const rotateY = y1 - rotateHandleDistance;
			const cos = Math.cos(rotation);
			const sin = Math.sin(rotation);
			const dx = rotateX - centerX;
			const dy = rotateY - centerY;
			const rotatedRotateX = centerX + dx * cos - dy * sin;
			const rotatedRotateY = centerY + dx * sin + dy * cos;

			if (
				Math.abs(actualX - rotatedRotateX) <= handleSize &&
				Math.abs(actualY - rotatedRotateY) <= handleSize
			) {
				canvas.style.cursor = 'grab';
			} else {
				// Check resize handles
				const corners = [
					{ lx: -width / 2, ly: -height / 2, cursor: 'nwse-resize' },
					{ lx: width / 2, ly: -height / 2, cursor: 'nesw-resize' },
					{ lx: -width / 2, ly: height / 2, cursor: 'nesw-resize' },
					{ lx: width / 2, ly: height / 2, cursor: 'nwse-resize' },
				];

				let onHandle = false;
				for (const corner of corners) {
					const worldX = centerX + corner.lx * cos - corner.ly * sin;
					const worldY = centerY + corner.lx * sin + corner.ly * cos;

					if (
						Math.abs(actualX - worldX) <= handleSize &&
						Math.abs(actualY - worldY) <= handleSize
					) {
						canvas.style.cursor = corner.cursor;
						onHandle = true;
						break;
					}
				}

				if (!onHandle) {
					// Check if inside table
					const localDx = actualX - centerX;
					const localDy = actualY - centerY;
					const localCos = Math.cos(-rotation);
					const localSin = Math.sin(-rotation);
					const localX = localDx * localCos - localDy * localSin;
					const localY = localDx * localSin + localDy * localCos;

					if (
						localX >= -width / 2 &&
						localX <= width / 2 &&
						localY >= -height / 2 &&
						localY <= height / 2
					) {
						canvas.style.cursor = 'move';
					} else {
						canvas.style.cursor = 'crosshair';
					}
				}
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
					status: 'available',
					capacity: 4,
					floor: parseInt(filterFloor),
					coords: [
						Math.round(x1),
						Math.round(y1),
						Math.round(x2),
						Math.round(y2),
					],
					rotation: 0.0,
				};

				// Call onAddTable yang akan handle async DB creation
				onAddTable(newTable)
					.then((addedTable) => {
						if (addedTable) {
							setLocalTables((prev) => [...prev, addedTable]);
							console.log('✅ Table added to canvas:', addedTable);
						}
					})
					.catch((error) => {
						console.error('❌ Failed to add table from canvas:', error);
						alert('❌ Gagal menambahkan meja: ' + error.message);
					});
			}
			setCurrentRect(null);
		}

		// Persist changes to parent when dragging, resizing, or rotating ends
		if ((isDragging || isResizing || isRotating) && selectedTable) {
			const updatedTable = localTables.find((t) => t.id === selectedTable.id);
			if (updatedTable) {
				const updates = {};
				if (updatedTable.coords) updates.coords = updatedTable.coords;
				if (updatedTable.rotation !== undefined)
					updates.rotation = updatedTable.rotation;
				onUpdateTable(selectedTable.id, updates);
				// Update selectedTable to reflect the new coords/rotation
				setSelectedTable(updatedTable);
			}
		}

		setIsDrawing(false);
		setIsDragging(false);
		setIsResizing(false);
		setIsRotating(false);
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
