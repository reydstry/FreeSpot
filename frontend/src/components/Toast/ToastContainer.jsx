import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
} from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// Toast Context
const ToastContext = createContext(null);

// Toast types configuration
const toastConfig = {
	success: {
		icon: CheckCircle,
		bgColor: 'bg-success',
		borderColor: 'border-success-dark',
		textColor: 'text-white',
	},
	error: {
		icon: AlertCircle,
		bgColor: 'bg-danger',
		borderColor: 'border-danger-dark',
		textColor: 'text-white',
	},
	warning: {
		icon: AlertTriangle,
		bgColor: 'bg-yellow-500',
		borderColor: 'border-yellow-600',
		textColor: 'text-white',
	},
	info: {
		icon: Info,
		bgColor: 'bg-blue-500',
		borderColor: 'border-blue-600',
		textColor: 'text-white',
	},
};

// Single Toast Component
const Toast = ({ id, message, type = 'info', onClose }) => {
	const config = toastConfig[type] || toastConfig.info;
	const Icon = config.icon;

	return (
		<div
			className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border-l-4 ${config.bgColor} ${config.borderColor} ${config.textColor} animate-slide-in min-w-[300px] max-w-[450px]`}
			role='alert'>
			<Icon className='w-5 h-5 shrink-0 mt-0.5' />
			<p className='flex-1 text-sm font-medium'>{message}</p>
			<button
				onClick={() => onClose(id)}
				className='shrink-0 hover:opacity-70 transition-opacity'>
				<X className='w-4 h-4' />
			</button>
		</div>
	);
};

// Toast Container Provider
export const ToastProvider = ({ children }) => {
	const [toasts, setToasts] = useState([]);

	const addToast = useCallback((message, type = 'info', duration = 4000) => {
		const id = Date.now() + Math.random();

		setToasts((prev) => [...prev, { id, message, type }]);

		// Auto remove toast after duration
		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	}, []);

	const removeToast = useCallback((id) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	// Shorthand methods
	const toast = {
		success: (message, duration) => addToast(message, 'success', duration),
		error: (message, duration) => addToast(message, 'error', duration),
		warning: (message, duration) => addToast(message, 'warning', duration),
		info: (message, duration) => addToast(message, 'info', duration),
	};

	// Listen for global toast events (for non-hook usage)
	useEffect(() => {
		const handleToastEvent = (event) => {
			const { message, type, duration } = event.detail;
			addToast(message, type, duration);
		};

		window.addEventListener('show-toast', handleToastEvent);
		return () => window.removeEventListener('show-toast', handleToastEvent);
	}, [addToast]);

	return (
		<ToastContext.Provider value={toast}>
			{children}
			{/* Toast Container - fixed position at top right */}
			<div className='fixed top-4 right-4 z-9999 flex flex-col gap-3 pointer-events-none'>
				{toasts.map((t) => (
					<div
						key={t.id}
						className='pointer-events-auto'>
						<Toast
							id={t.id}
							message={t.message}
							type={t.type}
							onClose={removeToast}
						/>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};

// Hook to use toast
export const useToast = () => {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context;
};

// Global toast function (for non-hook usage)
export const showToast = (message, type = 'info', duration = 4000) => {
	window.dispatchEvent(
		new CustomEvent('show-toast', {
			detail: { message, type, duration },
		})
	);
};

export default ToastProvider;
