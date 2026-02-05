
import React, { useState, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, Camera, Box, Grid3X3, Layers } from 'lucide-react';
import { RoomScan, PlacedPhoto } from '../types';

interface WalkthroughViewerProps {
  scan: RoomScan;
  onClose: () => void;
}

type RenderMode = 'solid' | 'wireframe';

const WalkthroughViewer: React.FC<WalkthroughViewerProps> = ({ scan, onClose }) => {
  const [rotation, setRotation] = useState({ x: 35, y: 0, z: -45 });
  const [zoom, setZoom] = useState(0.8);
  const [selectedPhoto, setSelectedPhoto] = useState<PlacedPhoto | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('solid');

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

  const isWireframe = renderMode === 'wireframe';

  const wallStyle = isWireframe 
    ? { background: 'rgba(59, 130, 246, 0.05)', border: '1px solid #3b82f6' } 
    : { backgroundImage: 'url(https://www.transparenttextures.com/patterns/concrete-wall.png)', backgroundColor: '#e5e7eb', borderBottom: '2px solid #d1d5db' };
  
  const floorStyle = isWireframe
    ? { background: 'transparent', border: '1px solid #3b82f6', opacity: 0.5 }
    : { backgroundImage: 'url(https://www.transparenttextures.com/patterns/wood-pattern.png)', backgroundColor: '#d1d5db', backgroundSize: '80px' };

  const PhotoMarker: React.FC<{ photo: PlacedPhoto }> = ({ photo }) => (
    <button onClick={() => setSelectedPhoto(photo)} className="absolute w-8 h-8 -m-4 flex items-center justify-center group z-10" style={{ left: `${photo.position.x}%`, bottom: `${photo.position.y}%` }}>
      <div className="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-pulse group-hover:opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
      <div className="relative w-4 h-4 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-lg ring-2 ring-blue-400"><Camera size={10} /></div>
      <div className="absolute -top-8 bg-black/80 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {photo.notes || `Photo #${photo.id}`}
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col animate-in fade-in duration-300">
      <header className="flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-md text-white border-b border-white/10 z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg"><Layers size={20} className="text-emerald-400"/></div>
          <div><h3 className="font-bold">{scan.roomName} Walkthrough</h3><p className="text-[10px] uppercase font-bold text-slate-400">{scan.dimensions.sqft.toFixed(1)} SQ FT • {scan.dimensions.length.toFixed(1)}' x {scan.dimensions.width.toFixed(1)}'</p></div>
        </div>
        
        <div className="flex items-center space-x-2 bg-black/40 rounded-lg p-1 border border-white/10">
             <button onClick={() => setRenderMode('solid')} className={`p-2 rounded-md transition-all ${renderMode === 'solid' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`} title="Solid View"><Box size={16} /></button>
             <button onClick={() => setRenderMode('wireframe')} className={`p-2 rounded-md transition-all ${renderMode === 'wireframe' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`} title="Wireframe View"><Grid3X3 size={16} /></button>
        </div>

        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
      </header>

      <main className="flex-1 flex items-center justify-center overflow-hidden relative" onWheel={handleWheel}>
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div 
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          onMouseDown={handleInteractionStart} onMouseMove={handleInteractionMove} onMouseUp={handleInteractionEnd} onMouseLeave={handleInteractionEnd}
          onTouchStart={handleInteractionStart} onTouchMove={handleInteractionMove} onTouchEnd={handleInteractionEnd}
          style={{ perspective: '2000px' }}
        >
          <div className="relative transition-transform duration-300" style={{ transform: `scale(${zoom})`, transformStyle: 'preserve-3d' }}>
            <div className="relative" style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`, transformStyle: 'preserve-3d', width: `${widthRem}rem`, height: `${lengthRem}rem` }}>
              
              <div className="absolute inset-0" style={{ transform: `translateZ(-${wallHeightRem / 2}rem) rotateX(90deg)`, ...floorStyle, transformStyle: 'preserve-3d' }}>
                 {isWireframe && <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)', backgroundSize: '20px 20px'}} />}
                 {scan.placedPhotos.filter(p => p.position.wall === 'floor').map(photo => <div key={photo.id} style={{transform: 'rotateX(-90deg)'}}><PhotoMarker photo={photo} /></div>)}
              </div>

              {isWireframe && <div className="absolute inset-0 border border-blue-500/30 bg-blue-500/5" style={{ transform: `translateZ(${wallHeightRem / 2}rem) rotateX(90deg)` }} />}

              <div className="absolute w-full h-full" style={{ transform: `translateZ(-${wallHeightRem / 2}rem)`, transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0 origin-bottom" style={{ height: `${wallHeightRem}rem`, transform: `translateZ(${lengthRem / 2}rem) rotateX(-90deg)`, ...wallStyle, transformStyle: 'preserve-3d' }}>
                    {scan.placedPhotos.filter(p => p.position.wall === 'back').map(photo => <PhotoMarker key={photo.id} photo={photo} />)}
                </div>
                <div className="absolute inset-0 origin-bottom" style={{ height: `${wallHeightRem}rem`, transform: `rotateY(180deg) translateZ(${lengthRem / 2}rem) rotateX(-90deg)`, ...wallStyle, opacity: isWireframe ? 1 : 0.3, transformStyle: 'preserve-3d' }}>
                     {scan.placedPhotos.filter(p => p.position.wall === 'front').map(photo => <PhotoMarker key={photo.id} photo={photo} />)}
                </div>
                <div className="absolute inset-0 origin-bottom" style={{ height: `${wallHeightRem}rem`, width: `${lengthRem}rem`, left: `-${(lengthRem - widthRem) / 2}rem`, transform: `rotateY(90deg) translateZ(${widthRem / 2}rem) rotateX(-90deg)`, ...wallStyle, transformStyle: 'preserve-3d' }}>
                     {scan.placedPhotos.filter(p => p.position.wall === 'left').map(photo => <PhotoMarker key={photo.id} photo={photo} />)}
                </div>
                <div className="absolute inset-0 origin-bottom" style={{ height: `${wallHeightRem}rem`, width: `${lengthRem}rem`, left: `-${(lengthRem - widthRem) / 2}rem`, transform: `rotateY(-90deg) translateZ(${widthRem / 2}rem) rotateX(-90deg)`, ...wallStyle, transformStyle: 'preserve-3d' }}>
                     {scan.placedPhotos.filter(p => p.position.wall === 'right').map(photo => <PhotoMarker key={photo.id} photo={photo} />)}
                </div>
              </div>
              
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center text-xs text-white font-bold bg-black/60 px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap ring-1 ring-white/10">{dimensions.width.toFixed(1)}' Width</div>
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-center text-xs text-white font-bold bg-black/60 px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap ring-1 ring-white/10" style={{transform: 'rotate(-90deg)'}}>{dimensions.length.toFixed(1)}' Length</div>
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-center text-xs text-white font-bold bg-black/60 px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap ring-1 ring-white/10" style={{transform: 'rotate(90deg)'}}>8.0' Height</div>
            </div>
          </div>
        </div>
      </main>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex justify-center items-center space-x-2 z-20 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md text-white p-2 rounded-2xl border border-white/10 flex space-x-2 pointer-events-auto shadow-xl">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><ZoomOut size={20} /></button>
          <button onClick={resetView} className="p-3 hover:bg-white/10 rounded-xl transition-colors border-l border-r border-white/10"><RotateCcw size={20} /></button>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><ZoomIn size={20} /></button>
        </div>
      </div>

      {selectedPhoto && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-30 animate-in fade-in duration-200" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full p-4" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedPhoto(null)} className="absolute -top-12 right-4 text-white hover:text-gray-300"><X size={32}/></button>
              <img src={selectedPhoto.url} className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/20 animate-in zoom-in-95 duration-300" alt={`Site photo ${selectedPhoto.id}`} />
              <div className="mt-4 text-white text-center">
                  <h4 className="font-bold text-lg">{selectedPhoto.notes || `Photo ID: ${selectedPhoto.id}`}</h4>
                  <p className="text-sm text-gray-400">Position: {selectedPhoto.position.wall} wall</p>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkthroughViewer;
