import React from 'react';
import { Camera, RefreshCcw } from 'lucide-react';
import CustomDropdown from './CustomDropdown';

const CctvPanel = ({
	feedsByFloor = {},
	floorOptions = [],
	floorValue = '1',
	onFloorChange,
	onRefresh,
}) => {
	// Get feeds for selected floor
	const effectiveFeeds = feedsByFloor[floorValue] || [];
	const hasFeed =
		Array.isArray(effectiveFeeds) &&
		effectiveFeeds.length > 0 &&
		!!effectiveFeeds[0];

	return (
		<div className='bg-primary rounded-2xl p-4 md:p-6 shadow-lg border border-white/10 mb-6'>
			<div className='flex items-center justify-between mb-4'>
				<div className='flex items-center gap-3 text-secondary'>
					<span className='inline-flex items-center gap-2 font-bold'>
						<Camera size={18} />
						CCTV Live
          </span>
          {hasFeed ? (
            <span className='hidden sm:inline-flex items-center gap-2 text-success font-semibold'>
						<span className='w-2 h-2 rounded-full bg-success animate-pulse' />
						  Online
					  </span>
          ) : (
            <span className='hidden sm:inline-flex items-center gap-2 text-danger font-semibold'>
            <span className='w-2 h-2 rounded-full bg-danger animate-pulse' />
              Offline
            </span>
          )}
				</div>
				<div className='flex items-center gap-2'>
					{floorOptions.length > 0 && (
						<CustomDropdown
							value={floorValue}
							onChange={onFloorChange}
							options={floorOptions}
							label='Pilih Lantai'
						/>
					)}
					<button
						type='button'
						onClick={onRefresh}
						className='px-3 py-2 rounded-xl bg-secondary text-primary font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-200'>
						<div className='inline-flex items-center gap-2'>
							<RefreshCcw size={16} />
							<span>Refresh</span>
						</div>
					</button>
				</div>
			</div>

			{hasFeed ? (
				<div
					className={`grid gap-3 ${effectiveFeeds.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
					{effectiveFeeds.map((src, idx) => (
						<div
							key={idx}
							className='relative w-full overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/60'>
							<div
								style={{ aspectRatio: '16 / 9' }}
								className='w-full'>
								<video
									className='w-full h-full object-cover'
									src={src}
									controls
									autoPlay
									muted
									loop
								/>
							</div>
							<div className='pointer-events-none absolute inset-0 bg-linear-to-t from-primary/20 via-transparent to-transparent' />
						</div>
					))}
				</div>
			) : (
				<div className='relative w-full overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/60'>
					<div
						style={{ aspectRatio: '16 / 9' }}
						className='w-full'>
						<div className='absolute inset-0 flex flex-col items-center justify-center text-secondary/90 select-none'>
							<div className='text-5xl mb-3'>📹</div>
							<p className='font-bold text-lg'>Belum ada feed</p>
							<p className='text-sm opacity-80'>
								Masukkan URL stream untuk menampilkan CCTV
							</p>
						</div>
					</div>
					<div className='pointer-events-none absolute inset-0 bg-linear-to-t from-primary/20 via-transparent to-transparent' />
				</div>
			)}
		</div>
	);
};

export default CctvPanel;
