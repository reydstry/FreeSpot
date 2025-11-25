import React, { useEffect } from 'react';

const FloorCanvas = ({
	canvasRef,
	canvasSize,
	videoFrame,
	filteredTables,
	selectedTable,
	currentRect,
	isDrawing,
	onCanvasMouseDown,
	onCanvasMouseMove,
	onCanvasMouseUp,
}) => {
	// Draw canvas
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

		if (videoFrame) {
			const img = new Image();
			img.onload = () => {
				ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
				drawTables(ctx);
			};
			img.src = videoFrame;
		} else {
			// Draw grid
			ctx.strokeStyle = '#e0e0e0';
			ctx.lineWidth = 1;
			for (let x = 0; x < canvasSize.width; x += 50) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, canvasSize.height);
				ctx.stroke();
			}
			for (let y = 0; y < canvasSize.height; y += 50) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(canvasSize.width, y);
				ctx.stroke();
			}
			drawTables(ctx);
		}
	}, [filteredTables, videoFrame, canvasSize, currentRect, selectedTable]);

	const drawTables = (ctx) => {
		filteredTables.forEach((table) => {
			if (!table.coords) return;
			const [x1, y1, x2, y2] = table.coords;
			const isSelected = selectedTable?.id === table.id;

			ctx.strokeStyle = isSelected ? '#ff6b6b' : '#4CAF50';
			ctx.lineWidth = isSelected ? 3 : 2;
			ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

			ctx.fillStyle = isSelected
				? 'rgba(255, 107, 107, 0.2)'
				: 'rgba(76, 175, 80, 0.2)';
			ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

			ctx.fillStyle = '#333';
			ctx.font = 'bold 14px Arial';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(table.name, (x1 + x2) / 2, (y1 + y2) / 2);

			// Draw resize handles for selected table
			if (isSelected) {
				const handleSize = 8;
				ctx.fillStyle = '#ff6b6b';

				// Top-left
				ctx.fillRect(
					x1 - handleSize / 2,
					y1 - handleSize / 2,
					handleSize,
					handleSize
				);
				// Top-right
				ctx.fillRect(
					x2 - handleSize / 2,
					y1 - handleSize / 2,
					handleSize,
					handleSize
				);
				// Bottom-left
				ctx.fillRect(
					x1 - handleSize / 2,
					y2 - handleSize / 2,
					handleSize,
					handleSize
				);
				// Bottom-right
				ctx.fillRect(
					x2 - handleSize / 2,
					y2 - handleSize / 2,
					handleSize,
					handleSize
				);
			}
		});

		if (isDrawing && currentRect) {
			const x1 = currentRect.x;
			const y1 = currentRect.y;
			const x2 = currentRect.x + currentRect.width;
			const y2 = currentRect.y + currentRect.height;

			ctx.strokeStyle = '#2196F3';
			ctx.lineWidth = 2;
			ctx.setLineDash([5, 5]);
			ctx.strokeRect(
				Math.min(x1, x2),
				Math.min(y1, y2),
				Math.abs(x2 - x1),
				Math.abs(y2 - y1)
			);
			ctx.setLineDash([]);
		}
	};

	return (
		<div className='bg-secondary rounded-2xl shadow-lg p-6 h-[618px] w-[80%]'>
			<div className='mb-3 p-3 bg-primary-dark/10 border-l-4 border-primary rounded-lg'>
				<p className='text-sm text-primary font-semibold'>
					💡 <strong>Cara Pakai:</strong>
				</p>
				<ul className='text-xs text-primary/80 mt-2 space-y-1 ml-4 list-disc'>
					<li>
						<strong>Drag meja</strong> untuk pindahkan posisi
					</li>
					<li>
						<strong>Drag handle merah</strong> di sudut untuk resize
					</li>
					<li>
						<strong>Click & drag area kosong</strong> untuk buat meja baru
					</li>
					<li>
						<strong>Delete/Backspace</strong> untuk hapus meja yang dipilih
					</li>
				</ul>
			</div>
			<canvas
				ref={canvasRef}
				width={canvasSize.width}
				height={canvasSize.height}
				onMouseDown={onCanvasMouseDown}
				onMouseMove={onCanvasMouseMove}
				onMouseUp={onCanvasMouseUp}
				onMouseLeave={onCanvasMouseUp}
				className='w-full border-2 border-secondary-dark rounded-xl cursor-crosshair'
				style={{ maxHeight: '430px', objectFit: 'contain', background: 'white' }}
			/>
		</div>
	);
};

export default FloorCanvas;
