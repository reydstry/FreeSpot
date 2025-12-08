import { useEffect, useRef } from 'react';
import { CANVAS_FPS_THROTTLE, TABLE_COLORS } from '../constants';

/**
 * Custom hook for drawing table overlays on canvas
 * @param {boolean} showOverlay - Whether to show the overlay
 * @param {Array} tables - Array of table objects with coords, status, rotation, etc.
 * @param {Array} feeds - Array of feed URLs
 * @param {Object} canvasSize - Canvas dimensions { width, height }
 * @param {Object} streamLoaded - Object tracking which streams are loaded
 * @param {Object} streamErrors - Object tracking which streams have errors
 * @returns {Object} overlayRefs - Ref object for canvas elements
 */
export const useTableOverlay = (
	showOverlay,
	tables,
	feeds,
	canvasSize,
	streamLoaded,
	streamErrors
) => {
	const overlayRefs = useRef({});

	useEffect(() => {
		if (!showOverlay || tables.length === 0) return;

		let animationIds = [];
		let lastDraw = 0;

		feeds.forEach((_, idx) => {
			const canvas = overlayRefs.current[idx];
			if (!canvas) return;

			const draw = (ts) => {
				// Throttle ~15fps
				if (ts - lastDraw < CANVAS_FPS_THROTTLE) {
					animationIds[idx] = requestAnimationFrame(draw);
					return;
				}
				lastDraw = ts;

				const ctx = canvas.getContext('2d');
				const container = canvas.parentElement;
				if (!container) return;

				// Get actual display size
				const displayWidth = container.offsetWidth;
				const displayHeight = container.offsetHeight;

				// Set canvas size to match display
				canvas.width = displayWidth;
				canvas.height = displayHeight;

				// Calculate scale factors
				const scaleX = displayWidth / canvasSize.width;
				const scaleY = displayHeight / canvasSize.height;

				// Clear canvas
				ctx.clearRect(0, 0, displayWidth, displayHeight);

				// Draw each table frame
				tables.forEach((table) => {
					drawTable(ctx, table, scaleX, scaleY);
				});

				animationIds[idx] = requestAnimationFrame(draw);
			};

			// Start the animation loop
			animationIds[idx] = requestAnimationFrame(draw);
		});

		// Cleanup function to cancel all animation frames
		return () => {
			animationIds.forEach((id) => {
				if (id) cancelAnimationFrame(id);
			});
		};
	}, [showOverlay, tables, feeds, canvasSize, streamLoaded]);

	return { overlayRefs };
};

/**
 * Draw a single table on the canvas
 */
function drawTable(ctx, table, scaleX, scaleY) {
	const coords = table.coords || [0, 0];
	const rotation = table.rotation || 0;
	const tableWidth = table.width || 100;
	const tableHeight = table.height || 100;

	// Calculate x1, y1, x2, y2 from coords
	let x1, y1, x2, y2;
	if (coords.length === 4) {
		// Old format: [x1, y1, x2, y2]
		x1 = coords[0] * scaleX;
		y1 = coords[1] * scaleY;
		x2 = coords[2] * scaleX;
		y2 = coords[3] * scaleY;
	} else {
		// New format: [x, y] + width/height
		x1 = coords[0] * scaleX;
		y1 = coords[1] * scaleY;
		x2 = (coords[0] + tableWidth) * scaleX;
		y2 = (coords[1] + tableHeight) * scaleY;
	}

	const width = x2 - x1;
	const height = y2 - y1;
	const centerX = (x1 + x2) / 2;
	const centerY = (y1 + y2) / 2;

	const isOccupied = table.status === 'occupied';
	const colors = isOccupied ? TABLE_COLORS.occupied : TABLE_COLORS.available;

	ctx.save();
	ctx.translate(centerX, centerY);
	ctx.rotate(rotation);

	// Draw border
	ctx.strokeStyle = colors.stroke;
	ctx.lineWidth = 2;
	ctx.setLineDash([5, 5]);
	ctx.strokeRect(-width / 2, -height / 2, width, height);

	// Draw fill
	ctx.fillStyle = colors.fill;
	ctx.fillRect(-width / 2, -height / 2, width, height);

	// Draw table name
	ctx.setLineDash([]);
	ctx.font = 'bold 12px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// Draw background for text
	const textMetrics = ctx.measureText(table.name);
	const textWidth = textMetrics.width + 8;
	const textHeight = 16;
	ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
	ctx.fillRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight);

	// Draw text
	ctx.fillStyle = colors.text;
	ctx.fillText(table.name, 0, 0);

	// Draw status indicator
	const statusText = isOccupied ? '● OCCUPIED' : '○ AVAILABLE';
	ctx.font = 'bold 9px Arial';
	const statusY = height / 2 - 8;
	ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
	const statusMetrics = ctx.measureText(statusText);
	ctx.fillRect(
		-statusMetrics.width / 2 - 4,
		statusY - 6,
		statusMetrics.width + 8,
		12
	);
	ctx.fillStyle = colors.text;
	ctx.fillText(statusText, 0, statusY);

	ctx.restore();
}

export default useTableOverlay;
