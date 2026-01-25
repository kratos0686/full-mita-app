
import React, { useState, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, Camera } from 'lucide-react';
import { RoomScan, PlacedPhoto } from '../data/mockApi';

interface WalkthroughViewerProps {
  scan: RoomScan;
  onClose: () => void;
}

const WalkthroughViewer: React.FC<WalkthroughViewerProps> = ({ scan, onClose }) => {
  const [rotation, setRotation] = useState({ x: 35, y: 0, z: -45 });
  const [zoom, setZoom] = useState(0.8);
  const [selectedPhoto, setSelectedPhoto] = useState<PlacedPhoto | null>(null);

  const isInteracting = useRef(false);
  const lastInteractionPos = useRef<{ x: number; y: number } | null>(null);

  const { dimensions } = scan;
  const aspectRatio = dimensions.width / dimensions.length;

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isInteracting.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastInteractionPos.current = { x: clientX, y: clientY };
  }, []);

  const handleInteractionMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteracting.current || !lastInteractionPos.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - lastInteractionPos.current.x;
    const dy = clientY - lastInteractionPos.current.y;
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x - dy * 0.2)),
      y: prev.y,
      z: prev.z + dx * 0.2,
    }));
    lastInteractionPos.current = { x: clientX, y: clientY };
  }, []);

  const handleInteractionEnd = useCallback(() => {
    isInteracting.current = false;
    lastInteractionPos.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    setZoom(prev => Math.max(0.3, Math.min(2, prev - e.deltaY * 0.001)));
  }, []);
  
  const resetView = () => {
    setRotation({ x: 35, y: 0, z: -45 });
    setZoom(0.8);
  };

  const wallHeightRem = 10;
  const baseSize = 30;
  const widthRem = aspectRatio >= 1 ? baseSize : baseSize * aspectRatio;
  const lengthRem = aspectRatio < 1 ? baseSize : baseSize / aspectRatio;

  return (
    <div className="fixed inset-0 bg-gray-800 z-[100] flex flex-col animate-in fade-in duration-300">
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-sm text-white border-b border-white/10 z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg"><ImageIcon size={20} /></div>
          <div><h3 className="font-bold">{scan.roomName} Walkthrough</h3><p className="text-[10px] uppercase font-bold opacity-60">{scan.dimensions.sqft.toFixed(1)} SQ FT</p></div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
      </header>

      <main className="flex-1 flex items-center justify-center overflow-hidden relative" onWheel={handleWheel}>
        <div 
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          onMouseDown={handleInteractionStart} onMouseMove={handleInteractionMove} onMouseUp={handleInteractionEnd} onMouseLeave={handleInteractionEnd}
          onTouchStart={handleInteractionStart} onTouchMove={handleInteractionMove} onTouchEnd={handleInteractionEnd}
          style={{ perspective: '2000px' }}
        >
          <div className="relative transition-transform duration-300" style={{ transform: `scale(${zoom})`, transformStyle: 'preserve-3d' }}>
            <div className="relative" style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`, transformStyle: 'preserve-3d', width: `${widthRem}rem`, height: `${lengthRem}rem` }}>
              {/* Floor */}
              <div className="absolute inset-0 bg-gray-300" style={{ transform: `translateZ(-${wallHeightRem / 2}rem) rotateX(90deg)`, backgroundImage: 'url(https://www.transparenttextures.com/patterns/wood-pattern.png)', backgroundSize: '80px' }}>
                {scan.placedPhotos.map(photo => (
                  <button key={photo.photoId} onClick={() => setSelectedPhoto(photo)} className="absolute w-8 h-8 -m-4 flex items-center justify-center group" style={{ left: `${photo.x}%`, top: `${photo.y}%` }}>
                    <div className="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-pulse group-hover:opacity-50" />
                    <div className="relative w-4 h-4 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-lg"><Camera size={10} /></div>
                  </button>
                ))}
              </div>
              {/* Ceiling */}
              <div className="absolute inset-0 bg-gray-200" style={{ transform: `translateZ(${wallHeightRem / 2}rem) rotateX(90deg)` }} />
              {/* Walls */}
              <div className="absolute w-full h-full" style={{ transform: `translateZ(-${wallHeightRem / 2}rem)`, transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0 bg-gray-200 border-b-2 border-gray-300" style={{ height: `${wallHeightRem}rem`, transform: `translateZ(${lengthRem / 2}rem)`, backgroundImage: 'url(https://www.transparenttextures.com/patterns/concrete-wall.png)' }} />
                <div className="absolute inset-0 bg-gray-200 border-b-2 border-gray-300" style={{ height: `${wallHeightRem}rem`, transform: `rotateY(180deg) translateZ(${lengthRem / 2}rem)`, backgroundImage: 'url(https://www.transparenttextures.com/patterns/concrete-wall.png)' }} />
                <div className="absolute inset-0 bg-gray-200 border-b-2 border-gray-300" style={{ height: `${wallHeightRem}rem`, width: `${lengthRem}rem`, left: `-${(lengthRem - widthRem) / 2}rem`, transform: `rotateY(90deg) translateZ(${widthRem / 2}rem)`, backgroundImage: 'url(https://www.transparenttextures.com/patterns/concrete-wall.png)' }} />
                <div className="absolute inset-0 bg-gray-200 border-b-2 border-gray-300" style={{ height: `${wallHeightRem}rem`, width: `${lengthRem}rem`, left: `-${(lengthRem - widthRem) / 2}rem`, transform: `rotateY(-90deg) translateZ(${widthRem / 2}rem)`, backgroundImage: 'url(https://www.transparenttextures.com/patterns/concrete-wall.png)' }} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="absolute bottom-4 left-4 right-4 flex justify-center items-center space-x-2 z-20 pointer-events-none">
        <div className="bg-gray-900/50 backdrop-blur-sm text-white p-2 rounded-full flex space-x-1 pointer-events-auto">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="p-2 hover:bg-white/20 rounded-full"><ZoomOut size={18} /></button>
          <button onClick={resetView} className="p-2 hover:bg-white/20 rounded-full"><RotateCcw size={18} /></button>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="p-2 hover:bg-white/20 rounded-full"><ZoomIn size={18} /></button>
        </div>
      </div>

      {selectedPhoto && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 animate-in fade-in" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto.url} onClick={e => e.stopPropagation()} className="max-w-[80vw] max-h-[80vh] rounded-lg shadow-2xl animate-in zoom-in" alt={`Site photo ${selectedPhoto.photoId}`} />
        </div>
      )}
    </div>
  );
};

export default WalkthroughViewer;
