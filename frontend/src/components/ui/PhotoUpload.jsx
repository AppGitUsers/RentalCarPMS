import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function PhotoUpload({ label, value, existingUrl, onChange, className, round = false }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(existingUrl || null);

  const handleFile = (file) => {
    if (!file) return;
    onChange(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-navy-700 mb-1.5">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
