import React from 'react';

const ToolbarActions = ({
	onVideoUpload,
	onAddTable,
	onEditFloor,
	uploadedFileName,
	onToggleFullscreen,
	isFullscreen,
}) => {
	return (
		<div className='mb-4'>
			<div className='flex flex-wrap gap-5 items-center'>
				<label className='px-3 py-1.5 bg-primary/90 border text-secondary/10 rounded-lg transition-colors duration-200 cursor-pointer flex items-center gap-2'>
					<span
						className='h-5 px-3 py-0.5 rounded-md font-bold 
						transition-all duration-700 ease-out
						shadow-md hover:shadow-xl hover:scale-110 active:scale-95
						relative overflow-hidden align-text-middle
						text-[9px]
						border border-transparent hover:border-secondary/30
						bg-secondary/80 text-primary hover:from-secondary/30 hover:to-secondary-light'>
						Pilih File
					</span>
					<input
						type='file'
						accept='video/*,image/*'
						onChange={onVideoUpload}
						className='hidden'
					/>
					<span className='text-secondary/70 text-[11px]'>
						{uploadedFileName || 'Tidak ada file yang dipilih'}
					</span>
				</label>

				<button
					onClick={onAddTable}
					className='
						px-4 py-1 rounded-lg font-bold 
						transition-all duration-700 ease-out
						shadow-md hover:shadow-xl hover:scale-110 hover:-translate-y-1 active:scale-95
						relative overflow-hidden
						border border-transparent hover:border-secondary/30
						bg-linear-to-br from-secondary-light to-secondary/15 text-primary hover:from-secondary/30 hover:to-secondary-light'>
					<div className='shine-animation'></div>
					<span className='relative z-10'>+ Tambah Meja</span>
				</button>

				<button
					onClick={onEditFloor}
					className='px-4 py-1 rounded-lg font-bold 
					transition-all duration-700 ease-out
					shadow-md hover:shadow-xl hover:scale-110 hover:-translate-y-1 active:scale-95
					relative overflow-hidden
					border border-transparent hover:border-secondary/30
					bg-linear-to-br from-secondary-light to-secondary/15 text-primary hover:from-secondary/30 hover:to-secondary-light'>
					<div className='shine-animation'></div>
					<span className='relative z-10'>+ Edit Lantai</span>
				</button>

				<button
					onClick={onToggleFullscreen}
					className='px-4 py-1 rounded-lg font-bold 
					transition-all duration-700 ease-out
					shadow-md hover:shadow-xl hover:scale-110 hover:-translate-y-1 active:scale-95
					relative overflow-hidden
					border border-transparent hover:border-secondary/30
					bg-linear-to-br from-primary to-primary-dark text-secondary hover:from-primary-dark hover:to-primary'>
					<div className='shine-animation'></div>
					<span className='relative z-10'>
						{isFullscreen ? '🗗 Exit Fullscreen' : '⛶ Fullscreen Canvas'}
					</span>
				</button>
			</div>
		</div>
	);
};

export default ToolbarActions;
