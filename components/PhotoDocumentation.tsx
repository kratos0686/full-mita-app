
import React, { useState, useMemo, useRef } from 'react';
import { Camera, Plus, Search, Tag, Filter, Grid, Image as ImageIcon, Sparkles, BrainCircuit, Loader2, Wand2, XCircle, FileText, Share2, ChevronRight, Scan, Cuboid, Palette, Film, Settings2, Video, Send, Check, X, Maximize2, Download, WifiOff, Edit3, ImagePlus, PlayCircle } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { blobToBase64 } from '../utils/photoutils';
import { useAppContext } from '../context/AppContext';

interface PhotoDocumentationProps {
  onStartScan: () => void;
  isMobile?: boolean;
}

type TabType = 'gallery' | 'generate' | 'edit' | 'video';

const PhotoDocumentation: React.FC<PhotoDocumentationProps> = ({ onStartScan, isMobile = false }) => {
  const { isOnline, selectedProjectId } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>('gallery');
  const [filter, setFilter] = useState('All');
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());
  const [suggestedTags, setSuggestedTags] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generation States
  const [genPrompt, setGenPrompt] = useState('');
  const [genAspectRatio, setGenAspectRatio] = useState('1:1');
  const [genSize, setGenSize] = useState('1K');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Edit States
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedEditImage, setSelectedEditImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  // Video States
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const [photos, setPhotos] = useState([
    { id: '1', url: 'https://picsum.photos/seed/mit1/400/400', tag: 'Source of Loss', timestamp: 'Oct 12, 08:30 AM', aiInsight: 'Class 3 Water Intrusion', type: 'image' },
    { id: '2', url: 'https://picsum.photos/seed/mit2/400/400', tag: 'Damage - Kitchen', timestamp: 'Oct 12, 09:15 AM', aiInsight: 'Category 2 (Grey Water)', type: 'image' },
    { id: '3', url: 'https://picsum.photos/seed/mit3/400/400', tag: 'Original Setup', timestamp: 'Oct 12, 11:00 AM', aiInsight: 'Optimal Placement Verified', type: 'image' },
  ]);
  
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const handleAnalyzePhoto = async (photoId: string, currentTag: string) => {
    if (!isOnline) {
        alert("AI tagging is unavailable in offline mode.");
        return;
    }
    setLoadingPhotos(prev => new Set(prev).add(photoId));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Using gemini-3-pro-preview for analysis
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `As an IICRC S500 expert, suggest 3 highly specific technical tags for a water mitigation photo that is currently described as "${currentTag}".`,
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["tags"] } }
      });
      const result = JSON.parse(response.text || '{"tags":[]}');
      setSuggestedTags(prev => ({ ...prev, [photoId]: result.tags }));
    } catch (error) { console.error("AI Analysis failed", error); } 
    finally { setLoadingPhotos(prev => { const next = new Set(prev); next.delete(photoId); return next; }); }
  };

  const applySuggestedTag = (photoId: string, newTag: string) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, tag: newTag } : p));
    setTagInputs(prev => ({ ...prev, [photoId]: newTag }));
    setSuggestedTags(prev => { const next = { ...prev }; delete next[photoId]; return next; });
  };
  
  const handleTagInputChange = (photoId: string, value: string) => {
    setTagInputs(prev => ({ ...prev, [photoId]: value }));
  };

  const handleTagUpdate = (photoId: string) => {
    const newTag = tagInputs[photoId];
    if (typeof newTag !== 'string') return;
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, tag: newTag.trim() || 'Untagged' } : p));
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  
  const handleVideoUpload = () => videoInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const localUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      
      if (!isOnline) {
          // Offline upload handling
          setPhotos(prev => [{ id: Date.now().toString(), url: localUrl, tag: 'Untagged', timestamp: 'Just now (Offline)', aiInsight: 'Queued for Analysis', type: isVideo ? 'video' : 'image' }, ...prev]);
          return;
      }

      setIsUploading(true);
      try {
        const base64Data = await blobToBase64(file);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // Using gemini-3-pro-preview for analysis (works for image and video)
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { mimeType: file.type, data: base64Data } }, { text: isVideo ? "Analyze this water mitigation video. Identify key actions and conditions." : "Analyze this water mitigation photo. Provide a concise 'tag' (3-4 words max) and a brief 'insight'." }] },
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { tag: { type: Type.STRING }, insight: { type: Type.STRING } }, required: ["tag", "insight"] } }
        });
        const result = JSON.parse(response.text);
        setPhotos(prev => [{ id: Date.now().toString(), url: localUrl, tag: result.tag || (isVideo ? 'Video Log' : 'Untagged'), timestamp: 'Just now', aiInsight: result.insight, type: isVideo ? 'video' : 'image' }, ...prev]);
      } catch (error) { console.error("AI Analysis failed", error); } 
      finally { setIsUploading(false); }
    }
  };

  const handleGenerateImage = async () => {
    if (!genPrompt.trim()) return;
    setIsProcessing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // Using gemini-3-pro-image-preview for image generation
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: genPrompt }] },
            config: {
                imageConfig: {
                    aspectRatio: genAspectRatio,
                    imageSize: genSize
                }
            }
        });
        // Find image part
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
                break;
            }
        }
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleEditImage = async () => {
    if (!editPrompt.trim() || !selectedEditImage) return;
    setIsProcessing(true);
    try {
        // Assuming selectedEditImage is a URL. Need to fetch to get blob/base64.
        const response = await fetch(selectedEditImage); 
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // Using gemini-2.5-flash-image for editing (nano banana)
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                    { text: editPrompt }
                ]
            }
        });
        for (const part of result.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                setEditedImage(`data:image/png;base64,${part.inlineData.data}`);
                break;
            }
        }
    } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleGenerateVideo = async () => {
      // Check for API key selection for Veo
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          await window.aistudio.openSelectKey();
      }

      setIsProcessing(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let operation;
        
        // If an image is selected for reference
        if (selectedEditImage) {
             const response = await fetch(selectedEditImage);
             const blob = await response.blob();
             const base64 = await blobToBase64(blob);
             // Using veo-3.1-fast-generate-preview with image
             operation = await ai.models.generateVideos({
                 model: 'veo-3.1-fast-generate-preview',
                 prompt: videoPrompt || "Animate this scene naturally.",
                 image: { imageBytes: base64, mimeType: 'image/png' },
                 config: { numberOfVideos: 1, resolution: '720p', aspectRatio: videoAspectRatio }
             });
        } else {
             // Text to video
             operation = await ai.models.generateVideos({
                 model: 'veo-3.1-fast-generate-preview',
                 prompt: videoPrompt,
                 config: { numberOfVideos: 1, resolution: '720p', aspectRatio: videoAspectRatio }
             });
        }

        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }
        
        const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (uri) {
            setGeneratedVideoUrl(`${uri}&key=${process.env.API_KEY}`);
        }

      } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };
  
  const availableTags = useMemo(() => ['All', ...Array.from(new Set(photos.map(p => p.tag)))], [photos]);
  const filteredPhotos = useMemo(() => filter === 'All' ? photos : photos.filter(p => p.tag === filter), [photos, filter]);

  const theme = {
    bg: isMobile ? 'bg-gray-50' : 'bg-slate-900',
    text: isMobile ? 'text-gray-900' : 'text-white',
    subtext: isMobile ? 'text-gray-500' : 'text-slate-400',
    card: isMobile ? 'bg-white border border-gray-100 shadow-sm' : 'glass-card',
    tagBtn: isMobile ? 'bg-white text-gray-600 border border-gray-100' : 'bg-slate-800 text-slate-300 border border-slate-700',
    activeTagBtn: isMobile ? 'bg-blue-600 text-white' : 'bg-brand-cyan text-slate-900',
    input: isMobile ? 'focus:bg-gray-100' : 'focus:bg-slate-800'
  };

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-24' : ''} ${theme.bg}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
      <input type="file" ref={videoInputRef} onChange={handleFileChange} className="hidden" accept="video/*" />
      
      <header className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
            <div>
            <h2 className={`text-2xl font-bold ${theme.text} tracking-tight`}>Field Intelligence</h2>
            <p className={`text-sm ${theme.subtext} font-medium`}>Multimodal Site Documentation</p>
            </div>
            <div className="flex space-x-2">
                <button onClick={handleUploadClick} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg active:scale-95 transition-transform">
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    <span>Capture</span>
                </button>
                 <button onClick={handleVideoUpload} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg active:scale-95 transition-transform">
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                </button>
            </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('gallery')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'gallery' ? 'bg-brand-cyan text-slate-900' : 'bg-white/5 text-slate-400'}`}>Gallery</button>
            <button onClick={() => setActiveTab('generate')} disabled={!isOnline} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'generate' ? 'bg-brand-cyan text-slate-900' : 'bg-white/5 text-slate-400'}`}>Generate</button>
            <button onClick={() => setActiveTab('edit')} disabled={!isOnline} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'edit' ? 'bg-brand-cyan text-slate-900' : 'bg-white/5 text-slate-400'}`}>Edit</button>
            <button onClick={() => setActiveTab('video')} disabled={!isOnline} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'video' ? 'bg-brand-cyan text-slate-900' : 'bg-white/5 text-slate-400'}`}>Veo Video</button>
        </div>
      </header>
      
      {activeTab === 'gallery' && (
      <>
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2">
            {availableTags.map(tag => (
            <button key={tag} onClick={() => setFilter(tag)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === tag ? theme.activeTagBtn : theme.tagBtn}`}>
                {tag}
            </button>
            ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
            <div key={photo.id} className={`group rounded-[1.5rem] overflow-hidden animate-in fade-in ${theme.card}`}>
                <div className="relative aspect-square bg-gray-100 cursor-pointer" onClick={() => setSelectedEditImage(photo.url)}>
                {photo.type === 'video' ? (
                     <div className="w-full h-full bg-black flex items-center justify-center text-white"><PlayCircle size={32} /></div>
                ) : (
                    <img src={photo.url} className={`w-full h-full object-cover ${selectedEditImage === photo.url ? 'ring-4 ring-brand-cyan' : ''}`} />
                )}
                <div className="absolute top-2 right-2 flex flex-col space-y-1">
                    <button onClick={(e) => { e.stopPropagation(); handleAnalyzePhoto(photo.id, photo.tag); }} className="p-2 bg-black/30 backdrop-blur-md rounded-lg text-white hover:bg-black/50" disabled={!isOnline}>
                    {loadingPhotos.has(photo.id) ? <Loader2 size={14} className="animate-spin" /> : (isOnline ? <BrainCircuit size={14} /> : <WifiOff size={14} className="opacity-50" />)}
                    </button>
                </div>
                </div>
                <div className="p-3">
                <input type="text" value={tagInputs[photo.id] ?? photo.tag} onChange={(e) => handleTagInputChange(photo.id, e.target.value)} onBlur={() => handleTagUpdate(photo.id)} className={`w-full bg-transparent text-xs font-bold ${theme.text} focus:outline-none ${theme.input} rounded p-1 -m-1`} />
                <p className={`text-[10px] ${theme.subtext} mt-1`}>{photo.timestamp}</p>
                {suggestedTags[photo.id] && (
                    <div className="mt-2 flex flex-wrap gap-1">
                    {suggestedTags[photo.id]?.map(tag => (
                        <button key={tag} onClick={() => applySuggestedTag(photo.id, tag)} className="px-2 py-1 bg-brand-cyan/20 text-brand-cyan rounded text-[10px] font-bold hover:bg-brand-cyan/30">{tag}</button>
                    ))}
                    </div>
                )}
                <p className={`text-[10px] italic mt-2 ${theme.subtext}`}>{photo.aiInsight}</p>
                </div>
            </div>
            ))}
        </div>
      </>
      )}

      {activeTab === 'generate' && (
        <div className={`${theme.card} p-6 rounded-[2rem] space-y-6`}>
           <h3 className={`text-lg font-bold ${theme.text}`}>Generate Reference Imagery</h3>
           <div className="space-y-4">
              <textarea 
                  value={genPrompt} 
                  onChange={e => setGenPrompt(e.target.value)} 
                  placeholder="Describe the water damage scenario or containment setup you want to visualize..." 
                  className={`w-full h-32 p-4 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-cyan ${theme.input}`}
              />
              <div className="flex space-x-4">
                  <select value={genAspectRatio} onChange={e => setGenAspectRatio(e.target.value)} className={`p-2 rounded-lg text-xs font-bold ${theme.input}`}>
                      {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                   <select value={genSize} onChange={e => setGenSize(e.target.value)} className={`p-2 rounded-lg text-xs font-bold ${theme.input}`}>
                      {['1K', '2K', '4K'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={handleGenerateImage} disabled={isProcessing} className="flex-1 bg-brand-cyan text-slate-900 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg hover:bg-cyan-400 disabled:opacity-50">
                     {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                     <span>Generate</span>
                  </button>
              </div>
           </div>
           {generatedImage && (
               <div className="mt-6 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                   <img src={generatedImage} alt="Generated" className="w-full" />
               </div>
           )}
        </div>
      )}

      {activeTab === 'edit' && (
        <div className={`${theme.card} p-6 rounded-[2rem] space-y-6`}>
           <h3 className={`text-lg font-bold ${theme.text}`}>AI Image Editor</h3>
           <p className={`text-xs ${theme.subtext}`}>Select an image from the gallery first.</p>
           {selectedEditImage ? (
               <div className="flex flex-col md:flex-row gap-6">
                   <div className="w-full md:w-1/2 aspect-square rounded-xl overflow-hidden bg-black/20">
                       <img src={selectedEditImage} className="w-full h-full object-contain" />
                   </div>
                   <div className="w-full md:w-1/2 space-y-4">
                       <textarea 
                          value={editPrompt} 
                          onChange={e => setEditPrompt(e.target.value)} 
                          placeholder="What changes should be made? e.g., 'Remove the person in background', 'Add retro filter'" 
                          className={`w-full h-32 p-4 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-cyan ${theme.input}`}
                       />
                       <button onClick={handleEditImage} disabled={isProcessing} className="w-full bg-brand-cyan text-slate-900 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg hover:bg-cyan-400 disabled:opacity-50">
                          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Edit3 size={18} />}
                          <span>Apply Edits</span>
                       </button>
                   </div>
               </div>
           ) : (
               <div className="p-8 text-center border-2 border-dashed border-white/10 rounded-2xl">
                   <p className="text-slate-500">No image selected. Go to Gallery and click an image.</p>
               </div>
           )}
           {editedImage && (
               <div className="mt-6">
                   <h4 className={`font-bold mb-2 ${theme.text}`}>Result</h4>
                   <img src={editedImage} className="w-full rounded-2xl shadow-2xl" />
               </div>
           )}
        </div>
      )}

      {activeTab === 'video' && (
        <div className={`${theme.card} p-6 rounded-[2rem] space-y-6`}>
           <h3 className={`text-lg font-bold ${theme.text}`}>Veo Video Generation</h3>
           <div className="space-y-4">
              <textarea 
                  value={videoPrompt} 
                  onChange={e => setVideoPrompt(e.target.value)} 
                  placeholder="Describe the video you want to generate..." 
                  className={`w-full h-32 p-4 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-cyan ${theme.input}`}
              />
               <div className="flex space-x-4 items-center">
                  <select value={videoAspectRatio} onChange={e => setVideoAspectRatio(e.target.value)} className={`p-2 rounded-lg text-xs font-bold ${theme.input}`}>
                      <option value="16:9">Landscape (16:9)</option>
                      <option value="9:16">Portrait (9:16)</option>
                  </select>
                  {selectedEditImage && <span className="text-xs text-green-400 flex items-center"><Check size={12} className="mr-1"/> Image Ref Active</span>}
                  <button onClick={handleGenerateVideo} disabled={isProcessing} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg hover:bg-indigo-500 disabled:opacity-50">
                     {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Film size={18} />}
                     <span>Generate Video</span>
                  </button>
              </div>
           </div>
           {generatedVideoUrl && (
               <div className="mt-6 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                   <video src={generatedVideoUrl} controls className="w-full" />
               </div>
           )}
        </div>
      )}

    </div>
  );
};

export default PhotoDocumentation;
