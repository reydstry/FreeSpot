import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomDropdown = ({
	value,
	onChange,
	options,
	label,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const selectedOption = options.find((opt) => opt.value === value);

	return (
		<div
			className='relative'
			ref={dropdownRef}>
			<button
				type='button'
				onClick={() => setIsOpen(!isOpen)}
				className={`
					appearance-none rounded-md p-2
					focus:outline-none cursor-pointer transition-all duration-300 
					flex items-center gap-2 min-w-30 font-normal text-sm
					${
						isOpen
							? 'bg-secondary-dark text-primary/60 shadow-[inset_0_4px_4px_rgb(0_0_0_/0.25)] ring-1 ring-primary/55 '
							: 'bg-secondary text-primary/60 shadow-[inset_0_4px_4px_rgb(0_0_0_/0.25)] ring-1 ring-primary/55 hover:bg-secondary-dark active:scale-95'
					}`}>
				<span>{selectedOption?.label || label}</span>

				<ChevronDown
					size={18}
					className={`ml-auto transition-transform duration-300 ${
						isOpen ? 'rotate-180' : ''
					} text-primary`}
				/>
			</button>

			{/* DROPDOWN MENU */}
			<div
				className={`
          absolute left-0 right-0 mt-2 bg-secondary rounded-xl shadow-xl
          border border-primary/55 z-50 overflow-y-auto
          transition-all duration-300 
          ${
						isOpen
							? 'opacity-100 max-h-46 visible'
							: 'opacity-0 max-h-0 invisible'
					}
        `}>
				<div>
					{options.map((option) => (
						<button
							key={option.value}
							type='button'
							onClick={() => {
								onChange(option.value);
								setIsOpen(false);
							}}
							className={`w-full text-left px-4 py-2 font-semibold 
                transition-colors duration-200 text-sm
                ${
									value === option.value
										? 'bg-primary text-secondary shadow-inner'
										: 'text-primary hover:bg-primary/10'
								}`}>
							<div className='flex items-center justify-between'>
								<span>{option.label}</span>

								{value === option.value && (
									<svg
										className='w-5 h-5 text-secondary'
										fill='currentColor'
										viewBox='0 0 20 20'>
										<path
											fillRule='evenodd'
											d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
											clipRule='evenodd'
										/>
									</svg>
								)}
							</div>
						</button>
					))}
				</div>
			</div>
		</div>
	);
};

export default CustomDropdown;
