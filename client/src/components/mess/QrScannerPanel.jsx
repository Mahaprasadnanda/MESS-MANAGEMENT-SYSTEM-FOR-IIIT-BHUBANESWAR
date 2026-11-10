import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export function QrScannerPanel({ onScanSuccess, disabled = false }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const lastScannedRef = useRef({ text: '', time: 0 });
  const fileInputRef = useRef(null);
  const containerId = 'mess-qr-reader-container';

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleStartCamera = async () => {
    setCameraError('');
    try {
      await stopCamera();
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => {
          const now = Date.now();
          // Debounce rapid consecutive scans of the same code within 3 seconds
          if (
            decodedText === lastScannedRef.current.text &&
            now - lastScannedRef.current.time < 3000
          ) {
            return;
          }
          lastScannedRef.current = { text: decodedText, time: now };
          onScanSuccess(decodedText);
        },
        () => {
          // Ignore per-frame decode misses
        }
      );

      setCameraActive(true);
    } catch (err) {
      const msg =
        err?.message ||
        'Camera permission denied or no camera available. You can upload a QR image or use Manual Lookup.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError('');
    try {
      const tempId = 'mess-qr-file-scanner';
      let el = document.getElementById(tempId);
      if (!el) {
        el = document.createElement('div');
        el.id = tempId;
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      const qr = new Html5Qrcode(tempId);
      const decodedText = await qr.scanFile(file, false);
      await qr.clear();
      onScanSuccess(decodedText);
    } catch {
      toast.error('Could not detect a valid QR code in that image.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {!cameraActive ? (
          <button
            type="button"
            disabled={disabled}
            onClick={handleStartCamera}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 transition disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            Start Camera Scanner
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition"
          >
            <CameraOff className="h-4 w-4" />
            Stop Camera
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          Scan QR Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {cameraError ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          {cameraError}
        </div>
      ) : null}

      <div
        className={`relative rounded-2xl border-2 border-dashed overflow-hidden transition ${
          cameraActive
            ? 'border-emerald-500 bg-slate-950 min-h-[280px]'
            : 'border-slate-200 bg-slate-50 min-h-[220px] flex items-center justify-center'
        }`}
      >
        <div id={containerId} className="w-full" />
        {!cameraActive ? (
          <div className="text-center p-6 pointer-events-none">
            <Camera className="h-9 w-9 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">Camera Preview Inactive</div>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Click &ldquo;Start Camera Scanner&rdquo; to scan a student&apos;s meal QR code, upload a QR image, or enter the coupon code manually.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
