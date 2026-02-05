
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Camera, Plus, Search, Tag, Filter, Grid, Image as ImageIcon, Sparkles, BrainCircuit, Loader2, Wand2, XCircle, FileText, Share2, ChevronRight, Scan, Cuboid, Palette, Film, Settings2, Video, Send, Check, X, Maximize2, Download, WifiOff, Edit3, ImagePlus, PlayCircle, Mic, StopCircle, RefreshCw, Clapperboard } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { blobToBase64 } from '../utils/photoutils';
import { useAppContext } from '../context/AppContext';
import { Project, Photo } from '../types';

interface PhotoDocumentationProps {
  onStartScan: () => void;
  isMobile?: boolean;
  project: Project;
}

type TabType = 'gallery' | 'generate' | 'edit' | 'video';
type PhotoItem = Photo & { type: 'image' | 'video' };

const PhotoDocumentation: React.FC<PhotoDocumentationProps> = ({ onStartScan, isMobile = false, project }) => {
  const { isOnline } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>('gallery');
  const [filter, setFilter] = useState('All');
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());
  const [suggestedTags, setSuggestedTags] = useState<Record<string, string[]>>({});
  const [photoInsights, setPhotoInsights] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  useEffect(() => {
      const projectPhotos: PhotoItem[] = project.rooms.flatMap(room => 
          room.photos.map(p => ({ ...p, type: 'image' }))
      );
      setPhotos(projectPhotos);
      const initialTagInputs: Record<string, string> = {};
      projectPhotos.forEach(p => {
          initialTagInputs[p.id] = p.tags[0] || 'Untagged';
      });
      setTagInputs(initialTagInputs);
  }, [project]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Generation States
  const [genPrompt, setGenPrompt] = useState('');
  const [genAspectRatio, setGenAspectRatio] = useState('1:1');
  const [genSize, setGenSize] = useState('1K');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Edit States
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedEditImage, setSelectedEditImage] = useState<PhotoItem | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  // Video States
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoReferenceImage, setVideoReferenceImage] = useState<string | null>(null);

  const ensureApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }
  };

  const handleAnalyzePhoto = async (photo: PhotoItem) => {
    if (!isOnline) return;
    setLoadingPhotos(prev => new Set(prev).add(photo.id));
    
    try {
      await ensureApiKey();
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let base64Data = '';
      try {
        // Attempt to fetch the image data
        const response = await fetch(photo.url);
        const blob = await response.blob();
        base64Data = await blobToBase64(blob);
      } catch (e) {
        console.warn("Could not fetch image for analysis, falling back to text-based context.");
      }

      const model = 'gemini-3-pro-image-preview';
      let promptText = "Analyze this image for water mitigation documentation. Identify the material affected, the type of damage visible, and equipment present. Provide 3 specific technical tags and a 1-sentence professional insight.";
      
      let parts: any[] = [];
      if (base64Data) {
          parts = [
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
              { text: promptText }
          ];
      } else {
          parts = [{ text: `Context: A photo tagged "${photo.tags.join(', ')}" with description "${photo.notes}". ${promptText}` }];
      }

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: { 
            responseMimeType: "application/json", 
            responseSchema: { 
                type: Type.OBJECT, 
                properties: { 
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    insight: { type: Type.STRING }
                }, 
                required: ["tags", "insight"] 
            } 
        }
      });
      
      const result = JSON.parse(response.text || '{"tags":[], "insight": ""}');
      setSuggestedTags(prev => ({ ...prev, [photo.id]: result.tags }));
      setPhotoInsights(prev => ({ ...prev, [photo.id]: result.insight }));

    } catch (error) { 
        console.error("AI Analysis failed", error); 
    } finally { 
        setLoadingPhotos(prev => { const next = new Set(prev); next.delete(photo.id); return next; }); 
    }
  };

  const handleGenerateImage = async () => {
    if (!genPrompt.trim() || !isOnline) return;
    setIsProcessing(true);
    try {
      await ensureApiKey();
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: genPrompt }] },
        config: {
          imageConfig: {
            aspectRatio: genAspectRatio as any,
            imageSize: genSize as any
          }
        }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    } catch (err) { console.error("Generation failed", err); }
    finally { setIsProcessing(false); }
  };

  const handleEditImage = async () => {
    if (!editPrompt.trim() || !selectedEditImage || !isOnline) return;
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Use original URL to fetch and convert to base64 if needed
      const imgResponse = await fetch(selectedEditImage.url);
      const blob = await imgResponse.blob();
      const base64Img = await blobToBase64(blob);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Img } },
            { text: editPrompt }
          ]
        }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setEditedImage(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    } catch (err) { console.error("Editing failed", err); }
    finally { setIsProcessing(false); }
  };

  const handleGenerateVideo = async () => {
    if ((!videoPrompt.trim() && !videoReferenceImage) || !isOnline) return;
    setIsProcessing(true);
    try {
      await ensureApiKey();
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation;
      
      if (videoReferenceImage) {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: videoPrompt || "Animate this scene realistically",
          image: {
            imageBytes: videoReferenceImage.split(',')[1],
            mimeType: 'image/png'
          },
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: videoAspectRatio as any
          }
        });
      } else {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: videoPrompt,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: videoAspectRatio as any
          }
        });
      }

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const videoBlob = await videoResponse.blob();
        setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
      }
    } catch (err) { console.error("Video generation failed", err); }
    finally { setIsProcessing(false); }
  };

  const handleApplyGeneration = (mediaUrl: string, type: 'image' | 'video') => {
    const newItem: PhotoItem = {
      id: Date.now().toString(),
      url: mediaUrl,
      timestamp: Date.now(),
      tags: ['AI Generated'],
      notes: type === 'image' ? genPrompt : videoPrompt,
      type: type
    };
    setPhotos(prev => [newItem, ...prev]);
    setActiveTab('gallery');
    setGeneratedImage(null);
    setEditedImage(null);
    setGeneratedVideoUrl(null);
  };

  const theme = {
    bg: isMobile ? 'bg-gray-50' : 'bg-slate-900',
    card: isMobile ? 'bg-white border border-gray-100 shadow-sm' : 'glass-card',
    text: isMobile ? 'text-gray-900' : 'text-white',
    subtext: isMobile ? 'text-blue-600' : 'text-blue-400',
    itemBg: isMobile ? 'bg-white' : 'bg-white/5',
    itemBorder: isMobile ? 'border-gray-100' : 'border-white/10'
  };

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-24' : ''} ${theme.bg}`}>
      <input type="file" ref={fileInputRef} onChange={(e) => {/* existing handler */}} className="hidden" accept="image/*" />
      <input type="file" ref={videoInputRef} onChange={(e) => {/* existing handler */}} className="hidden" accept="video/*" />
      
      <header className="flex flex-col space-y-4 px-1">
        <div className="flex items-center justify-between">
           <div>
              <h2 className={`text-2xl font-bold ${theme.text} tracking-tight`}>Documentation</h2>
              <p className={`text-sm ${theme.subtext}`}>Visual Evidence & AI Enhancements</p>
           </div>
           <div className="flex space-x-2">
             <button onClick={() => setActiveTab('gallery')} className={`p-3 rounded-2xl transition-all ${activeTab === 'gallery' ? 'bg-brand-indigo text-white shadow-lg' : 'bg-slate-800 text-blue-300'}`}><ImageIcon size={20} /></button>
             <button onClick={() => setActiveTab('generate')} className={`p-3 rounded-2xl transition-all ${activeTab === 'generate' ? 'bg-brand-indigo text-white shadow-lg' : 'bg-slate-800 text-blue-300'}`}><Sparkles size={20} /></button>
             <button onClick={() => setActiveTab('video')} className={`p-3 rounded-2xl transition-all ${activeTab === 'video' ? 'bg-brand-indigo text-white shadow-lg' : 'bg-slate-800 text-blue-300'}`}><Film size={20} /></button>
           </div>
        </div>
      </header>
      
      {activeTab === 'gallery' && (
      <>
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2 px-1">
            {['All', ...Array.from(new Set(photos.flatMap(p => p.tags)))].map(tag => (
            <button key={tag} onClick={() => setFilter(tag)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === tag ? 'bg-brand-cyan text-slate-900' : 'bg-slate-800 text-blue-300 border border-slate-700'}`}>
                {tag}
            </button>
            ))}
        </div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 px-1">
            {photos.filter(p => filter === 'All' || p.tags.includes(filter)).map((photo) => (
            <div key={photo.id} className={`break-inside-avoid mb-4 group rounded-[1.5rem] overflow-hidden animate-in fade-in glass-card border border-white/5`}>
                <div className="relative bg-gray-900 cursor-pointer" onClick={() => { setSelectedEditImage(photo); setActiveTab('edit'); }}>
                    {photo.type === 'video' ? (
                        <div className="w-full aspect-square bg-black flex items-center justify-center text-white"><PlayCircle size={32} /></div>
                    ) : (
                        <img src={photo.url} className="w-full h-auto object-cover" alt={photo.tags[0]} />
                    )}
                    <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleAnalyzePhoto(photo); }} className="p-2 bg-black/50 backdrop-blur-md rounded-lg text-white" title="Analyze with AI"><BrainCircuit size={14} /></button>
                    </div>
                </div>
                <div className="p-3">
                   <p className="text-xs font-bold text-white mb-1">{photo.tags[0]}</p>
                   <p className="text-[10px] text-blue-400 italic line-clamp-2">{photo.notes}</p>
                   
                   {/* Analysis Loading State */}
                   {loadingPhotos.has(photo.id) && (
                       <div className="mt-2 flex items-center space-x-2 text-[10px] text-brand-cyan animate-pulse">
                           <Loader2 size={10} className="animate-spin" />
                           <span>Analyzing image...</span>
                       </div>
                   )}

                   {/* Analysis Results */}
                   {(suggestedTags[photo.id] || photoInsights[photo.id]) && (
                       <div className="mt-3 pt-2 border-t border-white/10 space-y-2">
                           {photoInsights[photo.id] && <p className="text-[10px] text-emerald-400 font-medium leading-tight">✨ {photoInsights[photo.id]}</p>}
                           {suggestedTags[photo.id] && (
                               <div className="flex flex-wrap gap-1">
                                   {suggestedTags[photo.id].map(tag => (
                                       <span key={tag} className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-blue-200 border border-white/5">{tag}</span>
                                   ))}
                               </div>
                           )}
                       </div>
                   )}
                </div>
            </div>
            ))}
        </div>
      </>
      )}

      {activeTab === 'generate' && (
        <div className="p-1 space-y-6">
          <div className="glass-card p-6 rounded-[2.5rem] space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-brand-indigo/20 text-brand-indigo rounded-2xl"><Sparkles size={24}/></div>
              <div><h3 className="font-bold text-white">AI Image Generation</h3><p className="text-xs text-blue-400">Gemini 3 Pro Image Core</p></div>
            </div>
            
            <textarea value={genPrompt} onChange={e => setGenPrompt(e.target.value)} placeholder="Describe the professional scene to generate..." className="w-full h-32 bg-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan border border-white/10" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-1">Resolution</label>
                <select value={genSize} onChange={e => setGenSize(e.target.value)} className="w-full bg-slate-800 text-white rounded-xl p-3 text-xs border border-white/10">
                  <option value="1K">1K (Standard)</option>
                  <option value="2K">2K (High Res)</option>
                  <option value="4K">4K (Enterprise)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-1">Aspect Ratio</label>
                <select value={genAspectRatio} onChange={e => setGenAspectRatio(e.target.value)} className="w-full bg-slate-800 text-white rounded-xl p-3 text-xs border border-white/10">
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                  <option value="4:3">4:3 Standard</option>
                </select>
              </div>
            </div>

            <button onClick={handleGenerateImage} disabled={isProcessing} className="w-full py-4 bg-brand-indigo text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-xl shadow-brand-indigo/20 active:scale-95 transition-all">
              {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
              <span>{isProcessing ? 'Generating Image...' : 'Synthesize Scene'}</span>
            </button>
          </div>

          {generatedImage && (
            <div className="glass-card p-4 rounded-[2.5rem] animate-in zoom-in-95 duration-500">
              <img src={generatedImage} className="w-full rounded-2xl shadow-2xl" alt="Generated" />
              <div className="flex space-x-3 mt-4">
                <button onClick={() => setGeneratedImage(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm">Discard</button>
                <button onClick={() => handleApplyGeneration(generatedImage!, 'image')} className="flex-1 py-3 bg-brand-cyan text-slate-900 rounded-xl font-bold text-sm">Attach to Project</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'edit' && selectedEditImage && (
        <div className="p-1 space-y-6">
          <div className="glass-card p-6 rounded-[2.5rem] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl"><Wand2 size={24}/></div>
                <div><h3 className="font-bold text-white">Advanced AI Editor</h3><p className="text-xs text-blue-400">Gemini 2.5 Flash Image</p></div>
              </div>
              <button onClick={() => setActiveTab('gallery')} className="p-2 text-slate-400"><X size={20}/></button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-800 border border-white/10">
              <img src={editedImage || selectedEditImage.url} className="w-full h-full object-contain" alt="Target" />
              {isProcessing && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"><Loader2 size={32} className="text-white animate-spin" /></div>}
            </div>

            <div className="relative">
              <input value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g., 'Add a retro filter' or 'Remove the background person'" className="w-full bg-slate-800 text-white rounded-2xl p-4 pr-16 text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <button onClick={handleEditImage} disabled={isProcessing} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-amber-500 text-slate-900 rounded-xl"><Send size={20}/></button>
            </div>

            {editedImage && (
              <div className="flex space-x-3">
                <button onClick={() => setEditedImage(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm">Reset</button>
                <button onClick={() => handleApplyGeneration(editedImage!, 'image')} className="flex-1 py-3 bg-brand-cyan text-slate-900 rounded-xl font-bold text-sm">Save Changes</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'video' && (
        <div className="p-1 space-y-6">
          <div className="glass-card p-6 rounded-[2.5rem] space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-brand-cyan/20 text-brand-cyan rounded-2xl"><Clapperboard size={24}/></div>
              <div><h3 className="font-bold text-white">Veo Video Engine</h3><p className="text-xs text-blue-400">Professional Video Synthesis</p></div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-1">Reference Image (Optional)</label>
              <div className="flex items-center space-x-3">
                <button onClick={() => {/* choose from gallery */}} className="w-20 h-20 bg-slate-800 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 hover:text-white transition-colors"><Plus size={20}/><span className="text-[8px] font-bold mt-1">Select</span></button>
                {videoReferenceImage && <div className="relative w-20 h-20"><img src={videoReferenceImage} className="w-full h-full object-cover rounded-xl" /><button onClick={() => setVideoReferenceImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X size={10}/></button></div>}
              </div>
            </div>

            <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} placeholder="Describe the motion or scene..." className="w-full h-24 bg-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan border border-white/10" />

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-1">Aspect Ratio</label>
                <div className="flex space-x-2">
                  <button onClick={() => setVideoAspectRatio('16:9')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${videoAspectRatio === '16:9' ? 'bg-brand-cyan text-slate-900 border-brand-cyan' : 'bg-slate-800 text-slate-400 border-white/5'}`}>16:9</button>
                  <button onClick={() => setVideoAspectRatio('9:16')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${videoAspectRatio === '9:16' ? 'bg-brand-cyan text-slate-900 border-brand-cyan' : 'bg-slate-800 text-slate-400 border-white/5'}`}>9:16</button>
                </div>
            </div>

            <button onClick={handleGenerateVideo} disabled={isProcessing} className="w-full py-4 bg-brand-cyan text-slate-900 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-xl shadow-brand-cyan/20 active:scale-95 transition-all">
              {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Video size={20} />}
              <span>{isProcessing ? 'Rendering Video (May take minutes)...' : 'Animate Scene'}</span>
            </button>
          </div>

          {generatedVideoUrl && (
            <div className="glass-card p-4 rounded-[2.5rem] animate-in zoom-in-95 duration-500">
              <video src={generatedVideoUrl} className="w-full rounded-2xl shadow-2xl" controls autoPlay loop />
              <div className="flex space-x-3 mt-4">
                <button onClick={() => setGeneratedVideoUrl(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm">Discard</button>
                <button onClick={() => handleApplyGeneration(generatedVideoUrl!, 'video')} className="flex-1 py-3 bg-brand-indigo text-white rounded-xl font-bold text-sm">Save Video</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoDocumentation;
