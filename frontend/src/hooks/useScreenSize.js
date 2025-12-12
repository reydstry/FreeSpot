import { useState, useEffect } from 'react';

export default function useScreenSize() {
	const [width, setWidth] = useState(window.innerWidth);

	useEffect(() => {
		const handleResize = () => setWidth(window.innerWidth);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return {
		isMobile: width < 768, // mobile < 768px
		isTablet: width >= 768 && width < 1024,
		isDesktop: width >= 1024,
	};
}
