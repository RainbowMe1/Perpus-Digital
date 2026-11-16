'use client';

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { Camera, Scan, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onDetected: (value: string) => void;
  onError: (error: Error) => void;
}

export function BarcodeScanner({ onDetected, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRequestRef = useRef(0);
  const [scanning, setScanning] = useState(false);

  const stopScan = () => {
    scanRequestRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => {
    scanRequestRef.current += 1;
    controlsRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const startScan = async () => {
    const video = videoRef.current;
    if (!video) return;

    const scanRequest = ++scanRequestRef.current;
    setScanning(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Akses kamera memerlukan HTTPS atau localhost dan dukungan browser.');
      }
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      if (scanRequest !== scanRequestRef.current || !videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const controls = await reader.decodeFromStream(
        stream,
        video,
        (result, _error, scannerControls) => {
          if (!result || scanRequest !== scanRequestRef.current) return;
          scanRequestRef.current += 1;
          scannerControls.stop();
          controlsRef.current = null;
          stream.getTracks().forEach(track => track.stop());
          streamRef.current = null;
          setScanning(false);
          onDetected(result.getText());
        }
      );
      if (scanRequest !== scanRequestRef.current || !videoRef.current) {
        controls.stop();
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      controlsRef.current = controls;
    } catch (error) {
      if (scanRequest === scanRequestRef.current) {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setScanning(false);
        onError(error instanceof Error ? error : new Error('Tidak dapat membuka kamera.'));
      }
    }
  };

  return (
    <div>
      <div className="aspect-video bg-slate-900 rounded-xl mb-3 relative overflow-hidden flex items-center justify-center">
        <video ref={videoRef} className={`w-full h-full object-cover ${scanning ? '' : 'hidden'}`} muted playsInline />
        {!scanning && (
          <div className="text-white/60 text-center">
            <Camera className="w-14 h-14 mx-auto mb-2" />
            <p className="text-sm">Kamera scanner</p>
          </div>
        )}
        {scanning && <div className="absolute inset-8 border-2 border-primary-500 rounded-lg pointer-events-none"><div className="absolute left-0 right-0 top-1/2 border-t-2 border-primary-400 animate-pulse" /></div>}
      </div>
      <Button className="w-full" variant={scanning ? 'danger' : 'primary'} onClick={() => scanning ? stopScan() : void startScan()}>
        {scanning ? <X className="w-4 h-4" /> : <Scan className="w-4 h-4" />}
        {scanning ? 'Hentikan Scan Kamera' : 'Buka Kamera & Scan'}
      </Button>
    </div>
  );
}
