import { useState } from 'react';

function App() {
	const [file, setFile] = useState(null);
	const [videoUrl, setVideoUrl] = useState(null);
	const [loading, setLoading] = useState(false);

	const handleUpload = async () => {
		if (!file) return alert('Pilih video dulu!');
		setLoading(true);

		const formData = new FormData();
		formData.append('file', file);

		try {
			const res = await fetch('http://localhost:8000/detect-video', {
				method: 'POST',
				body: formData,
			});
			if (!res.ok)
				throw new Error('Gagal memproses (status ' + res.status + ')');
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			setVideoUrl(url);
		} catch (e) {
			alert(e.message || 'Gagal memproses video');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='p-4 text-center relative'>
			<h1 className='text-2xl font-bold mb-4'>
				🎥 YOLO Video Detection (Cloud)
			</h1>
			<input
				type='file'
				accept='video/*'
				onChange={(e) => setFile(e.target.files[0])}
			/>
			<br />
			<button
				onClick={handleUpload}
				disabled={loading}
				className='mt-3 px-4 py-2 bg-blue-600 text-white rounded'>
				{loading ? 'Processing...' : 'Upload & Detect'}
			</button>

			{videoUrl && (
				<video
					controls
					src={videoUrl}
					className='mt-5 mx-auto border rounded shadow'
					width='600'
				/>
			)}

			{loading && (
				<div className='processing-overlay'>
					<div className='spinner' />
					<p className='processing-text'>
						Sedang memproses video... Mohon tunggu
					</p>
				</div>
			)}
		</div>
	);
}

export default App;
