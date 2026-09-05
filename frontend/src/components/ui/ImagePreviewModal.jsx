import { useState } from 'react';
import { X, Download } from 'lucide-react';

export default function ImagePreviewModal({ src, alt, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!src) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(alt || 'image').replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-2.5 bg-white/90 hover:bg-white rounded-full shadow-lg text-slate-700 transition-colors"
            title="Download Image"
          >
            <Download size={20} className={downloading ? 'animate-bounce' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/90 hover:bg-white rounded-full shadow-lg text-slate-700 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <img
          src={src}
          alt={alt || 'Preview'}
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
        />

        {alt && (
          <p className="mt-3 text-white/80 text-sm font-medium">{alt}</p>
        )}
      </div>
    </div>
  );
}
