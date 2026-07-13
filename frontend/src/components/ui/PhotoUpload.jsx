import { useRef, useState } from 'react';
import { Camera, Image, Upload, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function PhotoUpload({ label, value, existingUrl, onChange, className, round = false }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [preview, setPreview] = useState(existingUrl || null);
  const [showMenu, setShowMenu] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    onChange(file);
    setPreview(URL.createObjectURL(file));
    setShowMenu(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  };

  return (
    <div className={cn('relative', className)}>
      {label && <label className="block text-sm font-medium text-navy-700 mb-1.5">{label}</label>}

      <div
        onClick={() => !preview && setShowMenu(true)}
        className={cn(
          'relative flex flex-col items-center justify-center border-2 border-dashed border-navy-200 bg-navy-50/50 hover:bg-navy-50 cursor-pointer transition-colors overflow-hidden',
          round ? 'w-28 h-28 rounded-full' : 'w-full h-36 rounded-xl'
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
            <button
              onClick={handleClear}
              className="absolute top-1.5 right-1.5 p-1 bg-navy-900/60 text-white rounded-full hover:bg-navy-900/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-navy-400">
            {round ? <Camera className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
            <span className="text-xs font-medium">Click to upload</span>
          </div>
        )}
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl shadow-lg border border-navy-100 overflow-hidden min-w-[170px]">
            <button
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
              onClick={() => { setShowMenu(false); cameraRef.current?.click(); }}
            >
              <Camera className="w-4 h-4 text-navy-500" />
              Take Photo
            </button>
            <div className="h-px bg-navy-100" />
            <button
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
              onClick={() => { setShowMenu(false); galleryRef.current?.click(); }}
            >
              <Image className="w-4 h-4 text-navy-500" />
              Choose from Gallery
            </button>
          </div>
        </>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
