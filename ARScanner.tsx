
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Camera, Ruler, Square, Check, RefreshCw, Zap, Plus, Cuboid, Layers, Share2, ArrowLeft, Maximize2, ScanLine, BrainCircuit, Orbit } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { blobToBase64 } from '../utils/photoutils';

interface ARScannerProps {
  onComplete: () => void;
}

type Point = { x: number; y: number; id: number };
type Mode = 'scan' | 'processing' | 'result';
type View = '2d' | '3d';

const ARScanner: React.FC<ARScannerProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('scan');
  const [resultView, setResultView] = useState<View>('2d');
  const [corners, setCorners] = useState<Point[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [lidarEnabled, setLidarEnabled] = useState(true);
  const [isIOS, setIsIOS] = useState(false);

  const [capturedImages, setCapturedImages] = useState<{ id: number; url: string; base64: string }[]>([]);
  const [aiGeneratedSvg, setAiGeneratedSvg] = useState<string>('');
  const [aiDimensions, setAiDimensions] = useState<{ length: number; width: number; sqft: number } | null>(null);
  const [aiRoomLabel, setAiRoomLabel] = useState<string>('');
  const [aiDamageAssessment, setAiDamageAssessment] = useState<string>('');
  const [processingMessage, setProcessingMessage] = useState<string>("Generating point cloud & measurements...");

  const [rotation, setRotation] = useState({ x: 60, y: 0, z: 45 });
  const [zoom, setZoom] = useState(1);
  const isInteracting = useRef(false);
  const lastInteractionPos = useRef<{ x: number, y: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);

  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (mode === 'scan') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'scan' || !lidarEnabled || !canvasRef.current || !isIOS) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId: number;
    let offset = 0;
    const render = () => {
      if (!ctx || !canvas) return;
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const time = Date.now() / 1000;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      offset = (offset + 1) % gridSize;
      for (let y = offset; y <= canvas.height; y += gridSize) {
        const distortion = Math.sin((y / canvas.height) * Math.PI + time) * 10;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 + Math.sin(y/100 + time) * 0.2})`;
        ctx.moveTo(0, y + distortion);
        ctx.lineTo(canvas.width, y + distortion);
        ctx.stroke();
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode, lidarEnabled, isIOS]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsScanning(true);
    } catch (err) {
      setPermissionError('Camera access required for 3D scanning.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const addCorner = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'scan' || !isIOS) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setCorners([...corners, { x, y, id: Date.now() }]);
  };
  
  const captureFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const base64 = await blobToBase64(blob);
    setCapturedImages(prev => [...prev, { id: Date.now(), url, base64 }]);
  };

  const processScan = async () => {
    setMode('processing');
    setProcessingMessage("Analyzing spatial data with MitigationAI™...");
    
    if (!isIOS) {
        if (capturedImages.length < 3) { setMode('scan'); return; };
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const imageParts = capturedImages.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img.base64 } }));
            const textPart = { text: `You are an expert photogrammetry AI. Analyze the following images taken inside a room during a water mitigation assessment. Based on these images, perform the following tasks:
1. Estimate the primary dimensions of the room: length and width in feet. Assume a standard 8-foot ceiling height.
2. Calculate the total floor area in square feet.
3. Provide a probable 'roomLabel' (e.g., 'Kitchen', 'Living Room').
4. Provide a brief 'damageAssessment' sentence, assuming a standard water loss scenario.
5. Generate a simple, clean, single-line SVG string representing a top-down 2D floor plan of the room's shape. The SVG should be scalable (viewBox="0 0 100 100") and use a black stroke.` };
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [textPart, ...imageParts] },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            length: { type: Type.NUMBER },
                            width: { type: Type.NUMBER },
                            squareFootage: { type: Type.NUMBER },
                            roomLabel: { type: Type.STRING },
                            damageAssessment: { type: Type.STRING },
                            floorPlanSvg: { type: Type.STRING }
                        },
                        required: ['length', 'width', 'squareFootage', 'roomLabel', 'damageAssessment', 'floorPlanSvg']
                    }
                }
            });
            const result = JSON.parse(response.text);
            setAiRoomLabel(result.roomLabel);
            setAiDamageAssessment(result.damageAssessment);
            setAiGeneratedSvg(result.floorPlanSvg);
            setAiDimensions({ length: result.length, width: result.width, sqft: result.squareFootage });
        } catch (error) {
            console.error("AI Photogrammetry failed:", error);
            setAiRoomLabel("AI Scan Failed");
            setAiDamageAssessment("Could not process images. Please try again with clearer photos.");
        } finally { setMode('result'); }
        return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `A room was scanned for water mitigation. The floor area is ${calculateArea()} sq ft with an 8-foot ceiling. 1. Based on these dimensions, suggest a probable 'roomLabel'. 2. Provide a brief 'damageAssessment' sentence.`;
       const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
       const text = response.text || "";
       const labelMatch = text.match(/roomLabel'?:? "([^"]+)"/i);
       const assessmentMatch = text.match(/damageAssessment'?:? "([^"]+)"/i);
       setAiRoomLabel(labelMatch ? labelMatch[1] : "Standard Room");
       setAiDamageAssessment(assessmentMatch ? assessmentMatch[1] : "Floor area has been successfully mapped.");
    } catch (error) {
        console.error("AI Scan Analysis failed:", error);
        setAiRoomLabel("Room Scan");
        setAiDamageAssessment("Dimensions captured. AI analysis unavailable.");
    } finally { setMode('result'); }
  };

  const calculateArea = () => {
    if (corners.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < corners.length; i++) {
      const j = (i + 1) % corners.length;
      area += corners[i].x * corners[j].y;
      area -= corners[j].x * corners[i].y;
    }
    return Math.abs(area / 2000).toFixed(1);
  };

  const processedFloorPlan = useMemo(() => {
    if (corners.length < 3) return null;
    const padding = 10; 
    const minX = Math.min(...corners.map(p => p.x)); const maxX = Math.max(...corners.map(p => p.x)); 
    const minY = Math.min(...corners.map(p => p.y)); const maxY = Math.max(...corners.map(p => p.y)); 
    const width = maxX - minX; const height = maxY - minY; 
    if (width === 0 || height === 0) return null; 
    const svgWidth = 100 - 2 * padding; const svgHeight = 100 - 2 * padding; 
    const scale = Math.min(svgWidth / width, svgHeight / height); 
    const scaledWidth = width * scale; const scaledHeight = height * scale; 
    const offsetX = (100 - scaledWidth) / 2; const offsetY = (100 - scaledHeight) / 2;
    const scaledCorners = corners.map(p => ({ x: ((p.x - minX) * scale) + offsetX, y: ((p.y - minY) * scale) + offsetY }));
    const pointsString = scaledCorners.map(p => `${p.x},${p.y}`).join(' ');
    return { scaledCorners, pointsString, width, height };
  }, [corners]);

  if (permissionError) {
    return (
      <div className="h-full bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center"><div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4"><ScanLine size={32} /></div><h2 className="text-xl font-bold mb-2">Scanner Unavailable</h2><p className="text-gray-400 text-sm mb-6">{permissionError}</p><button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-3 rounded-full font-bold">Retry Access</button></div>
    );
  }

  const resetScan = () => {
    setCorners([]);
    setCapturedImages([]);
    setAiDimensions(null);
    setAiGeneratedSvg('');
    setMode('scan');
  };
  
  const threeDAspectRatio = useMemo(() => {
    if (isIOS) {
      if (!processedFloorPlan || processedFloorPlan.height === 0) return 1;
      return processedFloorPlan.width / processedFloorPlan.height;
    } else {
      if (!aiDimensions || aiDimensions.width === 0) return 1;
      return aiDimensions.length / aiDimensions.width;
    }
  }, [isIOS, processedFloorPlan, aiDimensions]);
  
  const iosDimensions = useMemo(() => {
    if (!isIOS || !processedFloorPlan) return null;
    const PIXELS_PER_FOOT = 20; 
    const length = (processedFloorPlan.height / PIXELS_PER_FOOT).toFixed(1);
    const width = (processedFloorPlan.width / PIXELS_PER_FOOT).toFixed(1);
    return { length, width };
  }, [isIOS, processedFloorPlan]);

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isInteracting.current = true;
    if ('touches' in e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      } else { lastInteractionPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    } else { lastInteractionPos.current = { x: e.clientX, y: e.clientY }; }
  }, []);

  const handleInteractionMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteracting.current) return;
    if ('touches' in e) {
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        setZoom(prev => Math.max(0.5, Math.min(3, prev + (dist - (lastPinchDist.current ?? dist)) * 0.01)));
        lastPinchDist.current = dist;
      } else if (e.touches.length === 1 && lastInteractionPos.current) {
        const dx = e.touches[0].clientX - lastInteractionPos.current.x;
        const dy = e.touches[0].clientY - lastInteractionPos.current.y;
        setRotation(prev => ({ x: prev.x - dy * 0.5, y: prev.y, z: prev.z + dx * 0.5 }));
        lastInteractionPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    } else {
      if (lastInteractionPos.current) {
        const dx = e.clientX - lastInteractionPos.current.x;
        const dy = e.clientY - lastInteractionPos.current.y;
        setRotation(prev => ({ x: prev.x - dy * 0.5, y: prev.y, z: prev.z + dx * 0.5 }));
        lastInteractionPos.current = { x: e.clientX, y: e.clientY };
      }
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    isInteracting.current = false;
    lastInteractionPos.current = null;
    lastPinchDist.current = null;
    setRotation(r => ({...r})); 
  }, []);
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.01)));
  }, []);

  return (
    <div className="relative h-full bg-black overflow-hidden flex flex-col font-sans">
      {mode === 'scan' && (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          {isIOS && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />}
          <div data-testid="scan-area" className="absolute inset-0 z-10" onClick={isIOS ? addCorner : undefined} />
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between">
            <div className="p-4 pt-12 bg-gradient-to-b from-black/80 to-transparent"><div className="flex justify-between items-start"><div><div className="flex items-center space-x-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-xs font-black text-green-400 uppercase tracking-widest">{isIOS ? 'LiDAR Active' : 'AI Photogrammetry'}</span></div><h2 className="text-white font-bold text-lg mt-1">Room Scan</h2></div><button onClick={onComplete} className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white pointer-events-auto active:scale-95"><X size={20} /></button></div></div>
            {isIOS && corners.map((p) => (<div key={p.id} className="absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center" style={{ left: p.x, top: p.y }}><div className="w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-in zoom-in duration-200" /></div>))}
            <div className="p-6 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto">
              {!isIOS && (<div className="mb-4"><p className="text-white/80 text-xs text-center font-bold mb-3">Capture at least 3 photos from different angles.</p><div className="flex items-center space-x-2 h-16 bg-black/30 backdrop-blur-md rounded-xl p-2 overflow-x-auto">{capturedImages.map(img => <img key={img.id} src={img.url} className="h-full rounded-md" />)}</div></div>)}
              {isIOS ? (<div className="flex justify-between items-center mb-6"><div className="bg-black/40 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10"><div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Corners</div><div className="text-xl font-black text-white">{corners.length}</div></div>{isIOS && (<button onClick={() => setLidarEnabled(!lidarEnabled)} className={`p-3 rounded-full border transition-all ${lidarEnabled ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/10 border-white/10 text-gray-400'}`}><Zap size={20} /></button>)}</div>) : (<div className="flex justify-center items-center mb-6"><div className="bg-black/40 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10"><div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Photos Captured</div><div className="text-xl font-black text-white">{capturedImages.length}</div></div></div>)}
              <div className="flex space-x-4"><button onClick={isIOS ? addCorner : captureFrame} className="flex-1 bg-gray-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 active:bg-gray-700 transition-all border border-gray-700"><Plus size={20} /><span>{isIOS ? 'Mark Corner' : 'Capture Frame'}</span></button><button onClick={processScan} disabled={isIOS ? corners.length < 3 : capturedImages.length < 3} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg ${(isIOS ? corners.length >= 3 : capturedImages.length >= 3) ? 'bg-blue-600 text-white shadow-blue-900/50 active:scale-95' : 'bg-gray-800 text-gray-500 opacity-50 cursor-not-allowed'}`}><Cuboid size={20} /><span>Process Scan</span></button></div>
            </div>
          </div>
        </>
      )}
      {mode === 'processing' && (<div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-50"><div className="relative"><div className="w-24 h-24 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /><BrainCircuit size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" /></div><h3 className="text-white font-bold text-xl mt-8">AI Analysis in Progress</h3><p className="text-gray-400 text-sm mt-2">{processingMessage}</p></div>)}
      {mode === 'result' && (
        <div className="absolute inset-0 bg-gray-50 z-50 flex flex-col">
          <div className="bg-white px-4 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm"><div className="flex items-center space-x-3"><button onClick={resetScan} className="p-2 -ml-2 text-gray-400 hover:text-gray-900"><ArrowLeft size={24} /></button><div><h2 className="font-bold text-gray-900 text-lg">{aiRoomLabel} Model</h2><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{aiDimensions ? `${aiDimensions.sqft.toFixed(1)} SQ FT • 8' CEILING` : `${calculateArea()} SQ FT • 8' CEILING`}</div></div></div><div className="flex bg-gray-100 rounded-lg p-1"><button onClick={() => setResultView('2d')} className={`p-2 rounded-md transition-all ${resultView === '2d' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><Layers size={18} /></button><button onClick={() => setResultView('3d')} className={`p-2 rounded-md transition-all ${resultView === '3d' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><Orbit size={18} /></button></div></div>
          <div className="flex-1 relative bg-gray-100 overflow-hidden flex items-center justify-center p-8"><div className="absolute top-4 left-4 right-4 bg-white p-4 rounded-2xl border border-gray-200 flex items-start space-x-3 shadow-lg z-20"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BrainCircuit size={20} /></div><div><h4 className="text-xs font-bold text-gray-800">AI Damage Assessment</h4><p className="text-xs text-gray-500">{aiDamageAssessment}</p></div></div><div className="relative w-full aspect-square max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-8 transform transition-all duration-500">
              {resultView === '2d' ? (<>{isIOS ? (<svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/></pattern></defs><rect width="100" height="100" fill="url(#grid)" />{processedFloorPlan ? (<><polygon points={processedFloorPlan.pointsString} fill="#3b82f6" fillOpacity="0.1" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round"/>{processedFloorPlan.scaledCorners.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="1.5" fill="white" stroke="#2563eb" strokeWidth="0.5" />))}</>) : (<text x="50" y="50" textAnchor="middle" fontSize="4" fill="#9ca3af">Not enough points.</text>)}</svg>) : (<div className="w-full h-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: aiGeneratedSvg }} />)}</>) : (
                (() => {
                  const baseSize = 12; const wallHeightRem = 6;
                  const widthRem = threeDAspectRatio >= 1 ? baseSize : baseSize * threeDAspectRatio;
                  const heightRem = threeDAspectRatio < 1 ? baseSize : baseSize / threeDAspectRatio;
                  const lengthFt = isIOS ? iosDimensions?.length : (aiDimensions?.length || 0).toFixed(1);
                  const widthFt = isIOS ? iosDimensions?.width : (aiDimensions?.width || 0).toFixed(1);

                  return (
                    <div className="w-full h-full flex items-center justify-center perspective-[1000px] cursor-grab active:cursor-grabbing" onMouseDown={handleInteractionStart} onMouseMove={handleInteractionMove} onMouseUp={handleInteractionEnd} onMouseLeave={handleInteractionEnd} onTouchStart={handleInteractionStart} onTouchMove={handleInteractionMove} onTouchEnd={handleInteractionEnd} onWheel={handleWheel}>
                      <div className={`relative ${!isInteracting.current ? 'transition-transform duration-700' : ''}`} style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg) scale(${zoom})`, transformStyle: 'preserve-3d', width: `${widthRem}rem`, height: `${heightRem}rem` }}>
                        <div className="absolute bottom-0 w-full h-full bg-blue-500/10 border-t-2 border-blue-300" style={{ transform: `translateZ(-${wallHeightRem / 2}rem) rotateX(90deg)` }} />
                        <div className="absolute top-0 w-full h-full bg-blue-500/5" style={{ transform: `translateZ(${wallHeightRem / 2}rem) rotateX(90deg)` }} />
                        <div className="absolute w-full h-full" style={{ transform: `translateZ(-${wallHeightRem / 2}rem)` }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-200/50 to-transparent border-b-2 border-blue-200" style={{ height: `${wallHeightRem}rem`, transform: `translateZ(${heightRem / 2}rem)` }} />
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-200/50 to-transparent border-b-2 border-blue-200" style={{ height: `${wallHeightRem}rem`, transform: `rotateY(180deg) translateZ(${heightRem / 2}rem)` }} />
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-200/50 to-transparent border-b-2 border-blue-200" style={{ height: `${wallHeightRem}rem`, width: `${heightRem}rem`, left: `-${(heightRem - widthRem)/2}rem`, transform: `rotateY(90deg) translateZ(${widthRem/2}rem)` }} />
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-200/50 to-transparent border-b-2 border-blue-200" style={{ height: `${wallHeightRem}rem`, width: `${heightRem}rem`, left: `-${(heightRem - widthRem)/2}rem`, transform: `rotateY(-90deg) translateZ(${widthRem/2}rem)` }} />
                        </div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-gray-500 font-bold">{widthFt} ft</div>
                        <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-center text-xs text-gray-500 font-bold" style={{transform: 'rotate(-90deg)'}}>{lengthFt} ft</div>
                        <div className="absolute w-full h-full border border-blue-400/30" style={{ transform: `translateZ(-${wallHeightRem/2}rem)` }} />
                        <div className="absolute w-full h-full border border-blue-400/30" style={{ transform: `translateZ(${wallHeightRem/2}rem)` }} />
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
          <div className="bg-white p-4 flex flex-col items-center justify-center"><button onClick={onComplete} className="w-full max-w-xs py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all"><Check size={20} /><span>Save & Continue to Project</span></button></div>
        </div>
      )}
    </div>
  );
};

export default ARScanner;
