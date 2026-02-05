
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Camera, Ruler, Square, Check, RefreshCw, Zap, Plus, Cuboid, Layers, Share2, ArrowLeft, Maximize2, ScanLine, BrainCircuit, Orbit, Upload, Image as ImageIcon, Video, Edit, Undo, Trash2, WifiOff, Grid3X3, Camera as CameraIcon, Scan, Activity, Eye, Aperture, MousePointer2, Box, Sparkles, Target, Disc, Thermometer, List, TriangleAlert } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { blobToBase64 } from '../utils/photoutils';
import { RoomScan } from '../types';
import { useAppContext } from '../context/AppContext';

interface ARScannerProps {
  onComplete: (data?: RoomScan) => void;
}

type Mode = 'scan' | 'processing' | 'result';
type ScanMode = 'lidar' | 'photogrammetry' | 'splat' | 'object' | 'thermal';
type View = '2d' | '3d';

const ARScanner: React.FC<ARScannerProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement>(null);
  const { isOnline } = useAppContext();
  
  // State
  const [mode, setMode] = useState<Mode>('scan');
  const [scanMode, setScanMode] = useState<ScanMode>('lidar');
  const [resultView, setResultView] = useState<View>('2d');
  const [capturedImages, setCapturedImages] = useState<{ id: number; url: string; base64: string }[]>([]);
  
  // Sensor State
  const [imuData, setImuData] = useState<{ alpha: number, beta: number, gamma: number }>({ alpha: 0, beta: 0, gamma: 0 });
  const [isStable, setIsStable] = useState(true);
  const [autoCapture, setAutoCapture] = useState(false);
  const [vizEnabled, setVizEnabled] = useState(true);
  const lastCaptureTime = useRef<number>(0);
  
  // Environment
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // AI Results
  const [aiGeneratedSvg, setAiGeneratedSvg] = useState<string>('');
  const [aiDimensions, setAiDimensions] = useState<{ length: number; width: number; sqft: number, height: number } | null>(null);
  const [aiRoomLabel, setAiRoomLabel] = useState<string>('');
  const [aiDamageAssessment, setAiDamageAssessment] = useState<string>('');
  const [aiActionableInsights, setAiActionableInsights] = useState<string[]>([]);
  const [aiMaterials, setAiMaterials] = useState<string[]>([]);
  const [aiRestorability, setAiRestorability] = useState<string>('');
  
  const [processingMessage, setProcessingMessage] = useState<string>("");

  // 3D Interaction State
  const [rotation, setRotation] = useState({ x: 60, y: 0, z: 45 });
  const [zoom, setZoom] = useState(1);
  const isInteracting = useRef(false);
  const lastInteractionPos = useRef<{ x: number, y: number } | null>(null);

  // Thermal LUT (Look-Up Table) - Ironbow Style
  const thermalPalette = useMemo(() => {
    const palette = [];
    for (let i = 0; i < 256; i++) {
      // Logic for Ironbow: Dark Blue -> Purple -> Red -> Orange -> Yellow -> White
      let r, g, b;
      if (i < 64) { // Blue to Purple
        r = i * 2; g = 0; b = 255;
      } else if (i < 128) { // Purple to Red
        r = 128 + (i - 64) * 2; g = 0; b = 255 - (i - 64) * 4;
      } else if (i < 192) { // Red to Orange/Yellow
        r = 255; g = (i - 128) * 4; b = 0;
      } else { // Yellow to White
        r = 255; g = 255; b = (i - 192) * 4;
      }
      palette.push(`rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`);
    }
    return palette;
  }, []);

  useEffect(() => {
    // Initialize Sensor Listeners
    const handleOrientation = (e: DeviceOrientationEvent) => {
        setImuData({
            alpha: e.alpha || 0,
            beta: e.beta || 0,
            gamma: e.gamma || 0
        });
    };

    const handleMotion = (e: DeviceMotionEvent) => {
        if (e.accelerationIncludingGravity) {
            const { x, y, z } = e.accelerationIncludingGravity;
            const magnitude = Math.sqrt((x || 0)**2 + (y || 0)**2 + (z || 0)**2);
            const isDeviceStable = Math.abs(magnitude - 9.8) < 1.2;
            setIsStable(isDeviceStable);
        }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  useEffect(() => {
    if (mode === 'scan') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode]);

  useEffect(() => {
      if (autoCapture && mode === 'scan' && isStable) {
          const now = Date.now();
          const delay = (scanMode === 'splat' || scanMode === 'photogrammetry' || scanMode === 'thermal') ? 800 : 2000;
          if (now - lastCaptureTime.current > delay) {
              captureFrame();
              lastCaptureTime.current = now;
          }
      }
  }, [autoCapture, isStable, mode, scanMode]);

  // Unified Visualization Engine
  useEffect(() => {
    if (mode !== 'scan' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    
    if (!processingCanvasRef.current) {
        processingCanvasRef.current = document.createElement('canvas');
        processingCanvasRef.current.width = 64; 
        processingCanvasRef.current.height = 64;
    }
    const procCanvas = processingCanvasRef.current;
    const procCtx = procCanvas.getContext('2d');

    let animationFrameId: number;

    const render = () => {
      if (!ctx || !canvas || !video || video.readyState !== 4) {
          animationFrameId = requestAnimationFrame(render);
          return;
      }

      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (vizEnabled && procCtx) {
        procCtx.drawImage(video, 0, 0, procCanvas.width, procCanvas.height);
        const frame = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
        const data = frame.data;
        const scaleX = canvas.width / procCanvas.width;
        const scaleY = canvas.height / procCanvas.height;
        const time = Date.now();

        // --- THERMAL IMAGING MODE ---
        if (scanMode === 'thermal') {
            // Draw thermal simulation
            for (let y = 0; y < procCanvas.height; y++) {
                for (let x = 0; x < procCanvas.width; x++) {
                    const i = (y * procCanvas.width + x) * 4;
                    // Calculate luminance as proxy for heat
                    const luminance = Math.floor(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
                    
                    ctx.fillStyle = thermalPalette[luminance];
                    ctx.fillRect(x * scaleX, y * scaleY, scaleX + 1, scaleY + 1);
                }
            }

            // HUD Overlays for Thermal Mode
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            
            // Thermal Scale bar on right
            const scaleW = 12;
            const scaleH = canvas.height * 0.4;
            const scaleXPos = canvas.width - 30;
            const scaleYPos = (canvas.height - scaleH) / 2;
            
            for(let i=0; i<scaleH; i++) {
                const ratio = 1 - (i / scaleH);
                ctx.fillStyle = thermalPalette[Math.floor(ratio * 255)];
                ctx.fillRect(scaleXPos, scaleYPos + i, scaleW, 1);
            }
            ctx.strokeRect(scaleXPos, scaleYPos, scaleW, scaleH);
            
            // Text for scale
            ctx.fillStyle = 'white';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'right';
            ctx.fillText("HOT", scaleXPos - 5, scaleYPos + 10);
            ctx.fillText("COLD", scaleXPos - 5, scaleYPos + scaleH);

            // Center spot temp simulation
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const centerLuminance = Math.floor(data[(32 * 64 + 32) * 4] * 0.299 + data[(32 * 64 + 32) * 4 + 1] * 0.587 + data[(32 * 64 + 32) * 4 + 2] * 0.114);
            const simulatedTemp = (68 + (centerLuminance / 255) * 32).toFixed(1);

            ctx.beginPath();
            ctx.strokeStyle = 'white';
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.textAlign = 'center';
            ctx.font = 'bold 16px JetBrains Mono';
            ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
            ctx.fillText(`${simulatedTemp}°F`, cx, cy - 20);
            ctx.shadowBlur = 0;
        }
        // --- GAUSSIAN SPLATS MODE ---
        else if (scanMode === 'splat') {
            for (let y = 0; y < procCanvas.height; y += 2) {
                for (let x = 0; x < procCanvas.width; x += 2) {
                    const i = (y * procCanvas.width + x) * 4;
                    const brightness = (data[i]+data[i+1]+data[i+2])/3;
                    if (brightness > 40 && brightness < 220) {
                        const alpha = isStable ? 0.6 : 0.3;
                        ctx.fillStyle = `rgba(${data[i]}, ${data[i+1]}, ${data[i+2]}, ${alpha})`;
                        ctx.beginPath();
                        const size = (4 + Math.sin(time/200 + x)*1) * (canvas.width/400); 
                        ctx.arc(x * scaleX, y * scaleY, size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
        // --- PHOTOGRAMMETRY MODE ---
        else if (scanMode === 'photogrammetry') {
            ctx.fillStyle = '#10b981';
            for (let y = 0; y < procCanvas.height; y += 3) {
                for (let x = 0; x < procCanvas.width; x += 3) {
                     const i = (y * procCanvas.width + x) * 4;
                     const iNext = ((y) * procCanvas.width + (x+1)) * 4;
                     if (Math.abs(data[i] - data[iNext]) > 25) {
                         ctx.fillRect(x * scaleX, y * scaleY, 3, 3);
                     }
                }
            }
        }
        // --- LIDAR MODE ---
        else if (scanMode === 'lidar') {
             ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
             for (let y = 0; y < procCanvas.height; y += 4) {
                for (let x = 0; x < procCanvas.width; x += 4) {
                    const i = (y * procCanvas.width + x) * 4;
                    const iNext = (y * procCanvas.width + x + 2) * 4;
                    if (Math.abs(data[i] - data[iNext]) > 30) {
                         ctx.fillRect(x * scaleX, y * scaleY, 2, 2);
                    }
                }
            }
            const betaClamped = Math.max(0, Math.min(imuData.beta, 90));
            if (betaClamped > 10 && betaClamped < 85) {
                 const horizonY = (canvas.height / 2) + (betaClamped - 45) * 8;
                 ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
                 ctx.lineWidth = 1;
                 ctx.beginPath();
                 const vanishX = canvas.width / 2;
                 for(let i=-200; i<canvas.width + 200; i+=100) {
                     ctx.moveTo(i, canvas.height); 
                     ctx.lineTo(vanishX, horizonY);
                 }
                 const scroll = (time / 20) % 50;
                 let yPos = canvas.height;
                 let gap = 50;
                 while(yPos > horizonY) {
                     ctx.moveTo(0, yPos + scroll - 50);
                     ctx.lineTo(canvas.width, yPos + scroll - 50);
                     yPos -= gap;
                     gap *= 0.8;
                 }
                 ctx.stroke();
            }
        }
        // --- OBJECT MODE (AR MAT) ---
        else if (scanMode === 'object') {
            const cx = canvas.width / 2;
            const cy = canvas.height * 0.6;
            ctx.save();
            ctx.translate(cx, cy);
            const betaRad = (Math.max(0, Math.min(imuData.beta, 80)) - 90) * (Math.PI/180);
            const gammaRad = (imuData.gamma || 0) * (Math.PI/180);
            const foreshortening = Math.sin(Math.abs(betaRad)); 
            
            // Determine if angle is "optimal" for scanning (approx 45 deg tilt)
            const isOptimalAngle = imuData.beta > 30 && imuData.beta < 60;
            const matColor = isOptimalAngle ? '#10b981' : '#f59e0b'; // Green if optimal, Amber otherwise

            ctx.rotate(gammaRad);
            ctx.scale(1, Math.max(0.1, foreshortening));
            
            // Outer Ring
            ctx.strokeStyle = matColor;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.stroke();
            
            // Inner Grid/Mat
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(${isOptimalAngle ? '16, 185, 129' : '245, 158, 11'}, 0.3)`;
            const gridSize = 30;
            for(let i=-100; i<=100; i+=gridSize) {
                ctx.beginPath(); ctx.moveTo(i, -100); ctx.lineTo(i, 100); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-100, i); ctx.lineTo(100, i); ctx.stroke();
            }

            // Scanning pulse
            if (isOptimalAngle) {
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
                ctx.beginPath(); 
                const pulse = (time / 1000) % 1;
                ctx.arc(0, 0, 150 * pulse, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
            
            if (isStable) {
                ctx.fillStyle = matColor;
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
                const guidance = isOptimalAngle ? "PERFECT ANGLE - SCANNING" : "TILT DEVICE 45°";
                ctx.fillText(guidance, cx, cy + 180);
            }
        }
      }

      // --- Common UI: Reticle ---
      if (scanMode !== 'object' && scanMode !== 'thermal') {
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          ctx.strokeStyle = isStable ? (scanMode === 'splat' ? '#ec4899' : '#10b981') : 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
          ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
          ctx.stroke();
      }

      if (Date.now() - lastCaptureTime.current < 200) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode, vizEnabled, isStable, scanMode, imuData, thermalPalette]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
              facingMode: 'environment', 
              width: { ideal: 1920 }, 
              height: { ideal: 1080 } 
          } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setPermissionError('Camera access required.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // If thermal mode, draw simulation into the actual capture
    if (scanMode === 'thermal') {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 128; // Higher res than viz for capture
        offCanvas.height = 128;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
            offCtx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);
            const frame = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
            const data = frame.data;
            const thermalCapture = ctx.createImageData(canvas.width, canvas.height);
            const sX = canvas.width / offCanvas.width;
            const sY = canvas.height / offCanvas.height;
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            for (let y = 0; y < offCanvas.height; y++) {
                for (let x = 0; x < offCanvas.width; x++) {
                    const i = (y * offCanvas.width + x) * 4;
                    const lum = Math.floor(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
                    ctx.fillStyle = thermalPalette[lum];
                    ctx.fillRect(x * sX, y * sY, sX + 1, sY + 1);
                }
            }
        }
    } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const base64 = await blobToBase64(blob);
    setCapturedImages(prev => [...prev, { id: Date.now(), url, base64 }]);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const processScan = async () => {
    if (capturedImages.length < 3) return;
    setMode('processing');
    
    const msg = scanMode === 'object' ? "Forensic Material Analysis..." :
                scanMode === 'splat' ? "Compiling 3D Point Cloud..." :
                scanMode === 'thermal' ? "Analyzing Heat Signatures..." :
                scanMode === 'photogrammetry' ? "Mapping Room Geometry..." :
                "Processing Topology...";
    setProcessingMessage(msg);
    
    if (!isOnline) {
         setTimeout(() => {
             setAiRoomLabel("Offline Scan");
             setAiDamageAssessment("Data stored locally. Sync to analyze.");
             setAiActionableInsights(["Connect to internet for AI analysis."]);
             setAiMaterials(["Unknown"]);
             setAiDimensions({ length: 12, width: 14, sqft: 168, height: 8 });
             setMode('result');
         }, 2000);
         return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const imageParts = capturedImages.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img.base64 } }));
        
        let contextPrompt = "";
        if (scanMode === 'object') {
            contextPrompt = `Perform a forensic restoration analysis of this object using IICRC standards.
            1. Identify the object and its primary material (e.g., Solid Wood, MDF, Upholstery).
            2. Detect signs of water damage: swelling at base, staining, delamination, or mold growth.
            3. Determine Restorability: 'Restorable', 'Partially Restorable', or 'Non-Salvageable'.
            4. Provide 3 specific restoration steps (e.g., 'Cleaning', 'Ozone Treatment', 'Disposal').
            5. Create a wireframe SVG (viewBox 0 0 100 100).`;
        } else if (scanMode === 'thermal') {
            contextPrompt = `Perform a thermal imaging analysis of these project site photos. 
            1. Identify potential moisture pockets (cold spots/blue-purple).
            2. Identify heat leaks or electrical hotspots.
            3. Estimate square footage of affected wall area.
            4. Suggest mitigation steps based on thermal patterns.
            5. Create an SVG floorplan highlighting hotspots.`;
        } else {
            contextPrompt = `Perform an IICRC S500 Water Damage Assessment of this room.
            1. Identify room type.
            2. Classify Water Loss (Class 1-4) based on visible porosity and migration.
            3. Detect affected materials (e.g., Drywall, Carpet, Hardwood).
            4. Provide 3 prioritized mitigation actions (e.g., 'Extract water', 'Remove pad', 'Install containment').
            5. Create a floorplan SVG (viewBox 0 0 100 100).`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: contextPrompt }, ...imageParts] },
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
                        restorability: { type: Type.STRING },
                        actionableInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
                        materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                        floorPlanSvg: { type: Type.STRING }
                    },
                    required: ['length', 'width', 'squareFootage', 'roomLabel', 'damageAssessment', 'floorPlanSvg', 'actionableInsights', 'materials']
                }
            }
        });

        const result = JSON.parse(response.text);
        setAiRoomLabel(result.roomLabel);
        setAiDamageAssessment(result.damageAssessment);
        setAiGeneratedSvg(result.floorPlanSvg);
        setAiActionableInsights(result.actionableInsights || []);
        setAiMaterials(result.materials || []);
        setAiRestorability(result.restorability || '');
        setAiDimensions({ length: result.length, width: result.width, sqft: result.squareFootage, height: 8 });

    } catch (error) {
        console.error("AI Analysis failed:", error);
        setAiRoomLabel("Analysis Failed");
        setAiDamageAssessment("Could not process data. Please retake photos.");
        setAiActionableInsights([]);
        setAiMaterials([]);
    } finally { setMode('result'); }
  };

  const handleComplete = () => {
      const scanData: RoomScan = {
          scanId: `scan-${Date.now()}`,
          roomName: aiRoomLabel || 'New Scan',
          floorPlanSvg: aiGeneratedSvg,
          dimensions: aiDimensions || { length: 0, width: 0, height: 8, sqft: 0 },
          placedPhotos: capturedImages.map((img, i) => ({
              id: img.id.toString(),
              url: img.url,
              timestamp: Date.now(),
              tags: [scanMode, ...aiMaterials],
              notes: `${scanMode.toUpperCase()} Capture. ${aiRestorability}`,
              position: { wall: 'front', x: 50, y: 50 }
          }))
      };
      onComplete(scanData);
  };

  const resetScan = () => {
    setCapturedImages([]);
    setAiDimensions(null);
    setAiGeneratedSvg('');
    setAiActionableInsights([]);
    setAiMaterials([]);
    setMode('scan');
  };

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isInteracting.current = true;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastInteractionPos.current = { x, y };
  }, []);

  const handleInteractionMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteracting.current || !lastInteractionPos.current) return;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = x - lastInteractionPos.current.x;
    const dy = y - lastInteractionPos.current.y;
    setRotation(prev => ({ x: prev.x - dy * 0.5, y: prev.y, z: prev.z + dx * 0.5 }));
    lastInteractionPos.current = { x, y };
  }, []);

  const handleInteractionEnd = useCallback(() => { isInteracting.current = false; }, []);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.01)));
  }, []);

  if (permissionError) {
    return (
      <div className="h-full bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center">
          <ScanLine size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Scanner Offline</h2>
          <p className="text-slate-400 text-sm mb-6">{permissionError}</p>
          <button onClick={() => window.location.reload()} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold">Retry Camera</button>
      </div>
    );
  }

  const threeDAspectRatio = aiDimensions ? aiDimensions.length / aiDimensions.width : 1;

  return (
    <div className="relative h-full bg-black overflow-hidden flex flex-col font-sans">
      {mode === 'scan' && (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between">
            <div className="p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent flex flex-col space-y-4">
               <div className="flex justify-between items-start pointer-events-auto">
                   <div>
                       <div className="flex items-center space-x-2 mb-1">
                           <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px] ${scanMode === 'thermal' ? 'bg-orange-500 shadow-orange-500' : scanMode === 'splat' ? 'bg-pink-500 shadow-pink-500' : 'bg-brand-cyan shadow-brand-cyan'}`} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${scanMode === 'thermal' ? 'text-orange-500' : scanMode === 'splat' ? 'text-pink-500' : 'text-brand-cyan'}`}>Engine v3.3</span>
                       </div>
                       <h2 className="text-white font-bold text-lg drop-shadow-md">Capture Environment</h2>
                   </div>
                   <div className="flex space-x-2">
                       <button onClick={() => setVizEnabled(!vizEnabled)} className={`p-2 rounded-lg backdrop-blur-md border ${vizEnabled ? 'bg-white/20 border-white/40 text-white' : 'bg-black/40 border-white/10 text-white/50'}`}><Eye size={18} /></button>
                       <button onClick={() => setAutoCapture(!autoCapture)} className={`p-2 rounded-lg backdrop-blur-md border ${autoCapture ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/40 border-white/10 text-white'}`}><Aperture size={18} /></button>
                       <button onClick={() => onComplete()} className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-white border border-white/10"><X size={18} /></button>
                   </div>
               </div>
               
               <div className="flex space-x-2 overflow-x-auto no-scrollbar pointer-events-auto pb-2">
                   <button onClick={() => setScanMode('lidar')} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border transition-all ${scanMode === 'lidar' ? 'bg-brand-cyan text-slate-900 border-brand-cyan' : 'bg-black/40 text-white border-white/10'}`}>LiDAR</button>
                   <button onClick={() => setScanMode('thermal')} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border transition-all ${scanMode === 'thermal' ? 'bg-orange-500 text-white border-orange-500' : 'bg-black/40 text-white border-white/10'}`}>Thermal</button>
                   <button onClick={() => setScanMode('photogrammetry')} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border transition-all ${scanMode === 'photogrammetry' ? 'bg-emerald-400 text-slate-900 border-emerald-400' : 'bg-black/40 text-white border-white/10'}`}>Photo</button>
                   <button onClick={() => setScanMode('splat')} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border transition-all ${scanMode === 'splat' ? 'bg-pink-500 text-white border-pink-500' : 'bg-black/40 text-white border-white/10'}`}>Splat</button>
                   <button onClick={() => setScanMode('object')} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border transition-all ${scanMode === 'object' ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-black/40 text-white border-white/10'}`}>Object</button>
               </div>
            </div>

            <div className="p-6 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto">
               <div className="flex justify-between items-end mb-6">
                   <div className="flex flex-col space-y-2">
                       <div className="flex items-center space-x-2">
                           <Activity size={14} className={isStable ? "text-emerald-400" : "text-amber-400"} />
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${isStable ? "text-emerald-400" : "text-amber-400"}`}>{isStable ? "Stable" : "Moving"}</span>
                       </div>
                       <div className="text-xs text-slate-400 font-mono">Pitch: {Math.round(imuData.beta)}°</div>
                   </div>
                   <div className="bg-black/40 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 flex flex-col items-center">
                       <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Frames</span>
                       <span className="text-xl font-black text-white">{capturedImages.length}</span>
                   </div>
               </div>

               <div className="flex space-x-4">
                   <button onClick={captureFrame} className="flex-1 bg-white/10 backdrop-blur-md text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 active:bg-white/20 transition-all border border-white/10">
                       <div className="w-12 h-12 rounded-full border-4 border-white flex items-center justify-center">
                           <div className="w-10 h-10 bg-white rounded-full active:scale-90 transition-transform" />
                       </div>
                   </button>
                   {capturedImages.length >= 3 && (
                       <button onClick={processScan} className="flex-1 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg bg-brand-cyan text-slate-900 animate-in slide-in-from-right">
                           <Cuboid size={20} />
                           <span>Process {scanMode === 'object' ? 'Mesh' : 'Room'}</span>
                       </button>
                   )}
               </div>
            </div>
          </div>
        </>
      )}

      {mode === 'processing' && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 p-8 text-center">
            <div className="relative mb-8">
                <div className={`w-32 h-32 border-4 rounded-full animate-spin ${scanMode === 'thermal' ? 'border-orange-500/20 border-t-orange-500' : scanMode === 'splat' ? 'border-pink-500/20 border-t-pink-500' : 'border-brand-cyan/20 border-t-brand-cyan'}`} />
                <BrainCircuit size={48} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" />
            </div>
            <h3 className="text-white font-black text-2xl mb-2">AI Processing</h3>
            <p className="text-slate-400 text-sm font-medium animate-pulse">{processingMessage}</p>
        </div>
      )}

      {mode === 'result' && aiDimensions && (
        <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col">
          <div className="bg-slate-900 px-4 py-4 border-b border-white/10 flex justify-between items-center shadow-lg">
              <div className="flex items-center space-x-3">
                  <button onClick={resetScan} className="p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={24} /></button>
                  <div>
                      <h2 className="font-bold text-white text-lg">{aiRoomLabel || 'Result'}</h2>
                      <div className="text-[10px] font-black text-brand-cyan uppercase tracking-widest">{aiDimensions.sqft ? `${aiDimensions.sqft.toFixed(1)} SQ FT` : 'Object Scanned'}</div>
                  </div>
              </div>
              <div className="flex bg-slate-800 rounded-lg p-1 border border-white/5">
                  <button onClick={() => setResultView('2d')} className={`p-2 rounded-md transition-all ${resultView === '2d' ? 'bg-slate-700 text-brand-cyan shadow-sm' : 'text-slate-400'}`}><Layers size={18} /></button>
                  <button onClick={() => setResultView('3d')} className={`p-2 rounded-md transition-all ${resultView === '3d' ? 'bg-slate-700 text-brand-cyan shadow-sm' : 'text-slate-400'}`}><Orbit size={18} /></button>
              </div>
          </div>

          <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col md:flex-row items-stretch p-4 gap-4">
              {/* Insights Panel */}
              <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto order-2 md:order-1">
                  <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
                      <div className="flex items-center space-x-2 mb-3">
                          <BrainCircuit size={16} className="text-brand-cyan" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Assessment</h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{aiDamageAssessment}</p>
                      {aiRestorability && (
                          <div className={`mt-3 py-1.5 px-3 rounded-lg text-xs font-bold text-center uppercase tracking-wide border ${aiRestorability.includes('Non') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              {aiRestorability}
                          </div>
                      )}
                  </div>

                  <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                          <List size={16} className="text-indigo-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Action Plan</h4>
                      </div>
                      <ul className="space-y-2">
                          {aiActionableInsights.map((insight, idx) => (
                              <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                                  <Check size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                                  <span>{insight}</span>
                              </li>
                          ))}
                      </ul>
                  </div>
                  
                  {aiMaterials.length > 0 && (
                      <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
                          <div className="flex items-center space-x-2 mb-3">
                              <Box size={16} className="text-amber-400" />
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Materials</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {aiMaterials.map((mat, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-white/5 rounded-md text-[10px] text-slate-300 border border-white/10">{mat}</span>
                              ))}
                          </div>
                      </div>
                  )}
              </div>

              {/* Visualization Container */}
              <div className="flex-1 relative bg-slate-800 rounded-2xl shadow-2xl border border-white/10 p-8 order-1 md:order-2">
                  {resultView === '2d' ? (
                      <div className="w-full h-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: aiGeneratedSvg.replace('<svg', '<svg class="w-full h-full drop-shadow-lg"') }} />
                  ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center perspective-[1000px] cursor-grab active:cursor-grabbing"
                        onMouseDown={handleInteractionStart} onMouseMove={handleInteractionMove} onMouseUp={handleInteractionEnd} onMouseLeave={handleInteractionEnd}
                        onTouchStart={handleInteractionStart} onTouchMove={handleInteractionMove} onTouchEnd={handleInteractionEnd}
                        onWheel={handleWheel}
                      >
                          <div className="relative transition-transform duration-75" style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg) scale(${zoom})`, transformStyle: 'preserve-3d', width: '12rem', height: `${12 * threeDAspectRatio}rem` }}>
                              {/* Floor */}
                              <div className="absolute inset-0 bg-slate-700 border-2 border-brand-cyan/50 opacity-80" style={{ transform: 'translateZ(-4rem)' }}>
                                  <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)', backgroundSize: '20px 20px'}} />
                              </div>
                              {/* Walls (Wireframe style) */}
                              <div className="absolute inset-0 border-2 border-brand-cyan/30" style={{ transform: 'translateZ(4rem)' }} />
                              <div className="absolute top-0 w-full border-t-2 border-brand-cyan/30" style={{ transform: 'rotateX(90deg) translateZ(6rem)', height: '8rem' }} />
                              <div className="absolute bottom-0 w-full border-b-2 border-brand-cyan/30" style={{ transform: 'rotateX(-90deg) translateZ(6rem)', height: '8rem' }} />
                          </div>
                      </div>
                  )}
              </div>
          </div>

          <div className="bg-slate-900 p-4 flex flex-col items-center justify-center border-t border-white/10">
              <button onClick={handleComplete} className="w-full max-w-xs py-4 bg-brand-cyan text-slate-900 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all">
                  <Check size={20} />
                  <span>Save Scan & Continue</span>
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARScanner;
