const ResponsiveWrapper = ({ children }) => {
	return (
		<div className='w-full h-full overflow-hidden'>
			<div
				className='
        mx-auto w-full
        px-4                /* tambah padding kecil */
        sm:px-6
        md:px-8
        max-w-[480px]       /* batas maksimal lebar di mobile */
      '>
				{children}
			</div>
		</div>
	);
};

export default ResponsiveWrapper;
