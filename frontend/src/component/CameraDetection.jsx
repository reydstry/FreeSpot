import { useRef, useState } from 'react';
import Webcam from 'react-webcam';

const videoConstraints = {
	width: 640,
	height: 480,
	facingMode: 'environment',
};

export default function CameraDetection() {
	const webcamRef = useRef(null);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [error, setError] = useState(null);

	const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

	const captureAndDetect = async () => {
		if (!webcamRef.current) return;
		setLoading(true);
		setError(null);
		setResult(null);
		try {
			const imageSrc = webcamRef.current.getScreenshot();
			// convert base64 to blob
			const res = await fetch(imageSrc);
			const blob = await res.blob();
			const formData = new FormData();
			formData.append('file', blob, 'frame.jpg');
			const detect = await fetch(`${backend}/detect`, {
				method: 'POST',
				body: formData,
			});
			if (!detect.ok)
				throw new Error('Gagal memproses (status ' + detect.status + ')');
			const data = await detect.json();
			setResult(data);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='camera-box'>
			<Webcam
				ref={webcamRef}
				audio={false}
				screenshotFormat='image/jpeg'
				videoConstraints={videoConstraints}
				className='webcam'
			/>
			<div className='actions'>
				<button
					disabled={loading}
					onClick={captureAndDetect}>
					{loading ? 'Memproses...' : 'Capture & Detect'}
				</button>
			</div>
			{error && <p className='error'>{error}</p>}
			{result && (
				<pre className='result'>{JSON.stringify(result, null, 2)}</pre>
			)}
		</div>
	);
}
