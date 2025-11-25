# === test_stream_local.py ===
import cv2

url = "http://10.160.22.170:8080/video"  # ganti dengan IP Webcam kamu
cap = cv2.VideoCapture(url)

if not cap.isOpened():
    print("❌ Tidak bisa membuka stream! Periksa IP Webcam & WiFi.")
else:
    print("✅ Stream dibuka, tekan 'q' untuk keluar.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️ Gagal membaca frame.")
            break

        cv2.imshow("Android Stream", frame)
        if cv2.waitKey(1) == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
