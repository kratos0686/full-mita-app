
import React, { useState, useRef, useEffect } from 'react';
import { Edit3, CheckCircle, X, FileText, Check, AlertCircle } from 'lucide-react';

interface FormsProps {
  onComplete: () => void;
}

const Forms: React.FC<FormsProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [printedName, setPrintedName] = useState('');
  const [nameError, setNameError] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const today = new Date();
    setDate(today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const validateName = (name: string) => {
    if (!name.trim()) return "Name cannot be empty.";
    if (!/^[a-zA-Z\s]*$/.test(name)) return "Name can only contain alphabetic characters.";
    return "";
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrintedName(val);
    setNameError(validateName(val));
  };

  const getPosition = (event: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (isSubmitted) return;
    const { x, y } = getPosition(event.nativeEvent);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsSigned(true);
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isSubmitted) return;
    const { x, y } = getPosition(event.nativeEvent);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
  };

  const handleSubmit = () => {
    const error = validateName(printedName);
    if (isSigned && !error) {
      setIsSubmitted(true);
    } else if (error) {
      setNameError(error);
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center text-center bg-gray-50 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50">
          <CheckCircle size={50} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Authorization Complete</h2>
        <p className="text-gray-600 mt-2">
          Thank you, {printedName}. The work order has been authorized and a copy has been sent to your email.
        </p>
        <button 
          onClick={onComplete}
          className="mt-8 w-full max-w-xs py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all"
        >
          <span>Return to Project</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">Authorization Form</h2>
        <p className="text-sm text-gray-500">Project: P-1002 - 124 Maple Ave</p>
      </header>
      
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
            <h3 className="text-lg font-bold text-gray-900">Authorization & Work Order</h3>
        </div>
        
        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          I, the undersigned property owner or authorized agent, hereby authorize Restoration | Mitigation™ to enter my property for the purposes of water damage assessment, mitigation, and restoration.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
              Owner/Agent Signature
            </label>
            <div className="relative">
              <canvas
                ref={canvasRef}
                className={`w-full h-40 bg-gray-50 rounded-2xl border-2 border-dashed ${isSigned ? 'border-blue-200' : 'border-gray-200'} cursor-crosshair`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!isSigned && (
                 <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                    <Edit3 size={20} className="mr-2" />
                    <span className="font-bold text-sm">Sign Here</span>
                </div>
              )}
               <button onClick={clearSignature} className="absolute top-2 right-2 p-2 bg-white/50 backdrop-blur-sm text-gray-500 rounded-full hover:text-red-500 transition-colors">
                 <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label htmlFor="printedName" className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                <span>Printed Name</span>
                {nameError && <span className="text-red-500 flex items-center uppercase"><AlertCircle size={10} className="mr-1" /> {nameError}</span>}
              </label>
              <input
                id="printedName"
                type="text"
                value={printedName}
                onChange={handleNameChange}
                className={`w-full bg-gray-50 border ${nameError ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'} rounded-xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-inner`}
                placeholder="Full Name (Alphabetic characters only)"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="date" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Date
              </label>
              <input
                id="date"
                type="text"
                value={date}
                readOnly
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold text-gray-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleSubmit}
        disabled={!isSigned || printedName.trim() === '' || nameError !== ''}
        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check size={20} />
        <span>Submit & Authorize Work</span>
      </button>
    </div>
  );
};

export default Forms;
