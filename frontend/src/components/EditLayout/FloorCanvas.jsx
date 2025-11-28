import React, { useEffect, useRef } from 'react';

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
	isFullscreen = false,
	onToggleFullscreen,
}) => {
	// Cache the background image to prevent flickering
	const backgroundImageRef = useRef(null);

	// Load and cache background image when videoFrame changes
	useEffect(() => {
		if (videoFrame) {
			const img = new Image();
			img.onload = () => {
				backgroundImageRef.current = img;
			};
			img.src = videoFrame;
		} else {
			backgroundImageRef.current = null;
		}
	}, [videoFrame]);

	// Draw canvas
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');

		const drawTables = () => {
			filteredTables.forEach((table) => {
				if (!table.coords) return;
				const [x1, y1, x2, y2] = table.coords;
				const isSelected = selectedTable?.id === table.id;
				const centerX = (x1 + x2) / 2;
				const centerY = (y1 + y2) / 2;
				const width = x2 - x1;
				const height = y2 - y1;
				const rotation = table.rotation || 0;

				ctx.save();
				ctx.translate(centerX, centerY);
				ctx.rotate(rotation);

				ctx.strokeStyle = isSelected ? '#ff6b6b' : '#4CAF50';
				ctx.lineWidth = isSelected ? 3 : 2;
				ctx.strokeRect(-width / 2, -height / 2, width, height);

				ctx.fillStyle = isSelected
					? 'rgba(255, 107, 107, 0.2)'
					: 'rgba(76, 175, 80, 0.2)';
				ctx.fillRect(-width / 2, -height / 2, width, height);

				ctx.fillStyle = '#333';
				ctx.font = 'bold 14px Arial';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(table.name, 0, 0);

				// Draw resize and rotate handles for selected table
				if (isSelected) {
					const handleSize = 8;
					ctx.fillStyle = '#ff6b6b';

					// Top-left
					ctx.fillRect(
						-width / 2 - handleSize / 2,
						-height / 2 - handleSize / 2,
						handleSize,
						handleSize
					);
					// Top-right
					ctx.fillRect(
						width / 2 - handleSize / 2,
						-height / 2 - handleSize / 2,
						handleSize,
						handleSize
					);
					// Bottom-left
					ctx.fillRect(
						-width / 2 - handleSize / 2,
						height / 2 - handleSize / 2,
						handleSize,
						handleSize
					);
					// Bottom-right
					ctx.fillRect(
						width / 2 - handleSize / 2,
						height / 2 - handleSize / 2,
						handleSize,
						handleSize
					);

					// Rotate handle (above the table)
					const rotateHandleDistance = 30;
					ctx.fillStyle = '#2196F3';
					ctx.beginPath();
					ctx.arc(0, -height / 2 - rotateHandleDistance, 6, 0, Math.PI * 2);
					ctx.fill();

					// Line connecting to rotate handle
					ctx.strokeStyle = '#2196F3';
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(0, -height / 2);
					ctx.lineTo(0, -height / 2 - rotateHandleDistance);
					ctx.stroke();
				}

				ctx.restore();
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

		ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

		if (backgroundImageRef.current) {
			// Draw cached background image immediately without reload
			ctx.drawImage(
				backgroundImageRef.current,
				0,
				0,
				canvasSize.width,
				canvasSize.height
			);
			drawTables();
		} else if (videoFrame) {
			// Fallback: if cached image not ready yet, wait for it
			const img = new Image();
			img.onload = () => {
				ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
				drawTables();
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
			drawTables();
		}
	}, [
		filteredTables,
		videoFrame,
		canvasSize,
		currentRect,
		selectedTable,
		isDrawing,
	]);

	return (
		<>
			{isFullscreen && (
				<div className='fixed inset-0 z-50 bg-black/50 flex flex-col'>
					<div className='p-4 bg-primary/70 backdrop-blur-2xl flex justify-between items-center'>
						<h3 className='text-secondary text-xl font-bold'>
							📐 Canvas Editor - Mode Fullscreen
						</h3>
						<button
							onClick={onToggleFullscreen}
							className='px-4 py-2 bg-danger hover:bg-danger/80 text-white rounded-lg font-semibold transition-all active:scale-95'>
							✕ Tutup Fullscreen
						</button>
					</div>
					<div className='flex-1 p-6 overflow-auto flex items-center justify-center'>
						<div className='w-full max-w-[95vw] flex flex-col items-center'>
							<canvas
								ref={canvasRef}
								width={canvasSize.width}
								height={canvasSize.height}
								onMouseDown={onCanvasMouseDown}
								onMouseMove={onCanvasMouseMove}
								onMouseUp={onCanvasMouseUp}
								onMouseLeave={onCanvasMouseUp}
								className='border-4 border-secondary rounded-xl cursor-crosshair shadow-2xl'
								style={{
									maxHeight: '83vh',
									maxWidth: '95vw',
									objectFit: 'contain',
									background: 'white',
								}}
							/>
						</div>
					</div>
				</div>
			)}

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
							<strong>Drag handle biru</strong> di atas untuk rotate
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
					style={{
						maxHeight: '430px',
						objectFit: 'contain',
						background: 'white',
					}}
				/>
			</div>
		</>
	);
};

export default FloorCanvas;
