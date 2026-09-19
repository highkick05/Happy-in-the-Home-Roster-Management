import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCw, X, Check, Loader2, Sparkles } from 'lucide-react';
import { getAvatarUrl } from '../../utils/avatar';

interface AvatarSelectorProps {
  value: string;
  onChange: (url: string) => void;
  token: string;
  label?: string;
  showPresets?: boolean;
}

const PRESET_AVATARS = [
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Doctor",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Nurse",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Medic",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Healer",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Therapist",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Surgeon",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Caregiver",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Health",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Pulse",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Life",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Smile",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Happy",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Joy",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Laugh",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Grin",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Beam",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Cheer",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Delight",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Glad",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Merry",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Sunny",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Warm",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Kind",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Gentle",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Caring",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Support",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Help",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Aid",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Cure",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Mend",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Practitioner",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Specialist",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Clinician",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Physician",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Orderly",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Attendant",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Midwife",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Paramedic",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Responder",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Rescuer",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Guardian",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Protector",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Angel",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Hero",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Lifesaver",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Wellness",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Comfort",
  "https://api.dicebear.com/9.x/pixel-art/svg?seed=Relief",
  "https://api.dicebear.com/9.x/big-ears/svg?seed=Soothe",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Calm"
];

export default function AvatarSelector({
  value,
  onChange,
  token,
  label = "Profile Avatar",
  showPresets = true
}: AvatarSelectorProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to process an image file to a 512x512 square JPEG blob
  const processImageFile = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const size = 512;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return reject(new Error('Canvas context not available'));
            }

            const minDim = Math.min(img.width, img.height);
            const startX = (img.width - minDim) / 2;
            const startY = (img.height - minDim) / 2;

            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to create image blob'));
              },
              'image/jpeg',
              0.88
            );
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to read image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Upload Blob to backend
  const uploadAvatarBlob = async (blob: Blob) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');

      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await res.json();
      onChange(data.url);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  // Handle standard file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';

    try {
      setUploading(true);
      const blob = await processImageFile(file);
      await uploadAvatarBlob(blob);
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
      setUploading(false);
    }
  };

  // Camera Management
  const startCamera = async (facing: 'user' | 'environment') => {
    stopCamera();
    setCameraError(null);
    setCapturedPhotoUrl(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser. Please use the Device Camera option.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 720 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or use Device Camera.'
          : 'Unable to access camera. You can use the Device Camera button or upload a photo.'
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleOpenLiveCamera = () => {
    setShowCameraModal(true);
    setCameraFacing('user');
    setCapturedPhotoUrl(null);
    setCameraError(null);
    startCamera('user');
  };

  const handleCloseCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
    setCapturedPhotoUrl(null);
    setCameraError(null);
  };

  const handleFlipCamera = () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    startCamera(newFacing);
  };

  // Capture still from video stream
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minDim = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    const startX = ((video.videoWidth || 480) - minDim) / 2;
    const startY = ((video.videoHeight || 480) - minDim) / 2;

    // Flip horizontally if user-facing camera for natural selfie orientation
    if (cameraFacing === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhotoUrl(dataUrl);
    stopCamera();
  };

  // Confirm photo captured from live camera
  const handleConfirmCapturedPhoto = async () => {
    if (!capturedPhotoUrl) return;
    try {
      setUploading(true);
      const res = await fetch(capturedPhotoUrl);
      const blob = await res.blob();
      handleCloseCameraModal();
      await uploadAvatarBlob(blob);
    } catch (err: any) {
      setError('Failed to process captured photo');
      setUploading(false);
    }
  };

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const isCustomPhoto =
    value &&
    (value.startsWith('/api/avatar/') ||
      value.startsWith('data:image/') ||
      (value.startsWith('http') && !value.includes('dicebear.com')));

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-zinc-400">{label}</label>
          {isCustomPhoto && (
            <span className="text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Custom Photo
            </span>
          )}
        </div>
      )}

      {/* Main Avatar Controls Container */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#121214] border border-white/[0.06] rounded-xl p-3 sm:p-4">
        {/* Avatar Circular Preview */}
        <div className="relative group shrink-0 self-center sm:self-auto">
          <img
            src={getAvatarUrl(value || 'Staff')}
            alt="Selected Avatar"
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#18181b] border-2 border-white/[0.12] object-cover shadow-md"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Action Buttons: Upload & Camera */}
        <div className="flex-1 w-full flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium border border-white/[0.08] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Upload Photo</span>
            </button>

            {/* Take Photo Button */}
            <button
              type="button"
              onClick={handleOpenLiveCamera}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium border border-white/[0.08] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-teal-400" />
              <span>Take Photo</span>
            </button>

            {/* Reset to preset avatar if currently a custom photo */}
            {isCustomPhoto && (
              <button
                type="button"
                onClick={() => onChange(PRESET_AVATARS[0])}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs hover:underline"
              >
                Reset to Preset
              </button>
            )}
          </div>

          <p className="text-[11px] text-zinc-400">
            Upload an image from your device, take a photo with your camera, or pick an avatar below.
          </p>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      </div>

      {/* Preset Avatars Carousel */}
      {showPresets && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
            <span>Or choose an illustrated avatar</span>
            <span className="text-[10px] text-zinc-400">{PRESET_AVATARS.length} options</span>
          </div>
          <div className="overflow-x-auto custom-scrollbar pb-2 pt-1 flex gap-2">
            {PRESET_AVATARS.map((url) => {
              const isSelected = value === url;
              return (
                <img
                  key={url}
                  src={url}
                  alt="avatar option"
                  className={`w-11 h-11 rounded-full cursor-pointer shrink-0 transition-all object-cover ${
                    isSelected
                      ? 'ring-2 ring-brand-teal scale-110 shadow-lg'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                  onClick={() => onChange(url)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f0f11] border border-white/[0.12] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">Take Profile Photo</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewfinder / Captured Preview */}
            <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
              {capturedPhotoUrl ? (
                // Frozen captured frame
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={capturedPhotoUrl}
                    alt="Captured preview"
                    className="w-full h-full object-cover"
                  />
                  {/* Face Framing Guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 rounded-full border-2 border-dashed border-teal-400/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                  </div>
                </div>
              ) : cameraError ? (
                // Camera error fallback state
                <div className="p-6 text-center space-y-4">
                  <Camera className="w-10 h-10 text-zinc-400 mx-auto" />
                  <p className="text-xs text-zinc-300 max-w-xs mx-auto leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseCameraModal();
                        nativeCameraInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Use Device Camera App
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseCameraModal();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Upload From Photos
                    </button>
                  </div>
                </div>
              ) : (
                // Live Camera Video
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                  />
                  {/* Face Framing Circular Guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 rounded-full border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-[#141417] border-t border-white/[0.08] flex items-center justify-between">
              {capturedPhotoUrl ? (
                // Captured Photo Controls
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhotoUrl(null);
                      startCamera(cameraFacing);
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCapturedPhoto}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Use This Photo</span>
                  </button>
                </>
              ) : (
                // Live Viewfinder Controls
                <>
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    title="Flip camera"
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-white/[0.08] transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Shutter Button */}
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="w-14 h-14 rounded-full border-4 border-white/40 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all focus:outline-none"
                  >
                    <div className="w-full h-full bg-white rounded-full hover:bg-teal-400 transition-colors" />
                  </button>

                  {/* Fallback to native camera */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseCameraModal();
                      nativeCameraInputRef.current?.click();
                    }}
                    title="Use Device Native Camera"
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-white/[0.08] text-xs font-medium transition-colors"
                  >
                    Device App
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
