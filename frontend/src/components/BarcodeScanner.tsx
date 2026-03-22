import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  active?: boolean;
}

const BarcodeScanner = ({ onScan, onError, active = true }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [status, setStatus] = useState<'starting' | 'active' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState('');
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const handleResult = useCallback(
    (result: string) => {
      const now = Date.now();
      // Debounce: ignore same barcode within 1.5 s
      if (result === lastScanRef.current && now - lastScanTimeRef.current < 1500) return;
      lastScanRef.current = result;
      lastScanTimeRef.current = now;
      // Stop the reader BEFORE calling onScan so that closing the dialog
      // from within onScan doesn't cause an unhandled rejection from the
      // still-running decode promise.
      try { readerRef.current?.reset(); } catch { /* ignore */ }
      try { onScan(result); } catch (err) {
        console.error('[BarcodeScanner] onScan threw:', err);
      }
    },
    [onScan]
  );

  useEffect(() => {
    if (!active) return;

    // Prefer EAN-8, EAN-13, UPC-A, UPC-E, Code 128
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
    ]);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (devices.length === 0) {
          setStatus('error');
          const msg = 'No camera found on this device.';
          setErrorMessage(msg);
          onError?.(msg);
          return;
        }

        // Prefer back camera on mobile
        const preferred =
          devices.find((d) => /back|rear|env/i.test(d.label)) ?? devices[0];

        await reader.decodeFromVideoDevice(
          preferred.deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              handleResult(result.getText());
            } else if (err && !(err instanceof NotFoundException)) {
              // NotFoundException fires continuously when no barcode in frame — ignore it
              console.debug('[BarcodeScanner]', err.message);
            }
          }
        );
        setStatus('active');
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.includes('Permission')
              ? 'Camera permission denied. Please allow camera access in your browser settings.'
              : err.message
            : 'Could not start camera scanner.';
        setStatus('error');
        setErrorMessage(msg);
        onError?.(msg);
      }
    })();

    return () => {
      try { readerRef.current?.reset(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
      {/* Viewfinder */}
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

      {/* Scanning overlay */}
      {status === 'active' && (
        <>
          {/* Corner guides */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-36">
              {/* top-left */}
              <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl" />
              {/* top-right */}
              <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr" />
              {/* bottom-left */}
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl" />
              {/* bottom-right */}
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br" />
              {/* scan line animation */}
              <span className="absolute left-1 right-1 h-0.5 bg-primary/70 animate-[scan_2s_ease-in-out_infinite]" />
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-xs text-white/70 bg-black/40 px-3 py-1 rounded-full">
              Point at barcode
            </span>
          </div>
        </>
      )}

      {/* Starting indicator */}
      {status === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
          <Camera className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-sm text-white">Starting camera…</p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4">
          <CameraOff className="w-10 h-10 text-destructive" />
          <div className="flex items-start gap-2 text-sm text-white text-center max-w-xs">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
          <p className="text-xs text-white/50">Use the barcode input field instead.</p>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
