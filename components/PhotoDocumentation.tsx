
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    Camera, Plus, Search, Tag, Filter, Grid, Image as ImageIcon, 
    Sparkles, BrainCircuit, Loader2, Wand2, XCircle, FileText, 
    Share2, ChevronRight, Scan, Cuboid, Palette, Film, Settings2, 
    Video, Send, Check, X, Maximize2, Download, WifiOff, Edit3, 
    ImagePlus, PlayCircle, Mic, StopCircle, RefreshCw, Clapperboard,
    Settings
} from 'lucide-react';
import { Type } from "@google/genai";
import { blobToBase64 } from '../utils/photoutils';
import { useAppContext } from '../context/AppContext';
import { Project, Photo } from '../types';
import { IntelligenceRouter } from '../services/IntelligenceRouter';

interface PhotoDocumentationProps {
  onStartScan: () => void;
  isMobile?: boolean;
  project: Project;
}

type TabType = 'gallery' | 'generate' | 'edit' | 'video';
type PhotoItem = Photo & { type: 'image' | 'video' };

const PhotoDocumentation: React.FC<PhotoDocumentationProps> = ({ onStartScan, isMobile = false, project }) => {
  const { isOnline, accessToken } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>('gallery');
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());
  const [suggestedTags, setSuggestedTags] = useState<Record<string, string[]>>({});
  const [photoInsights, setPhotoInsights] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

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

  useEffect(() => {
      const projectPhotos: PhotoItem[] = project.rooms.flatMap(room => 
          room.photos.map(p => ({ ...p, type: 'image' }))
      );
      setPhotos(projectPhotos);
  }, [project]);

  // Filtering Logic
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
        const matchesTag = filter === 'All' || p.tags.includes(filter);
        const matchesSearch = searchQuery === '' || 
            (p.notes?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
        return matchesTag && matchesSearch;
    });
  }, [photos, filter, searchQuery]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    photos.forEach(p => p.tags.forEach(t => tags.add(t)));
    return ['All', ...Array.from(tags)];
  }, [photos]);

  const handleAnalyzePhoto = async (photo: PhotoItem) => {
    if (!isOnline || !accessToken) return;
    setLoadingPhotos(prev => new Set(prev).add(photo.id));
    
    try {
      const router = new IntelligenceRouter(accessToken);
      const imgResponse = await fetch(photo.url);
      const blob = await imgResponse.blob();
      const base64Data = await blobToBase64(blob);

      const response = await router.execute('VISION_ANALYSIS', 
        { parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Analyze this restoration site photo. Identify moisture damage, building materials, and IICRC safety concerns. Return JSON: {tags: string[], insight: string}" }
        ]},
        { 
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
      );
      
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
    if (!genPrompt.trim() || !isOnline || !accessToken) return;
    setIsProcessing(true);
    try {
      const router = new IntelligenceRouter(accessToken);
      const response = await router.execute('VISION_ANALYSIS', 
        { parts: [{ text: genPrompt }] },
        {
          imageConfig: {
            aspectRatio: genAspectRatio as any,
            imageSize: genSize as any
          }
        }
      );
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    } catch (err) { console.error("Generation failed", err); }
    finally { setIsProcessing(false); }
  };

  const handleEditImage = async () => {
    if (!editPrompt.trim() || !selectedEditImage || !isOnline || !accessToken) return;
    setIsProcessing(true);
    try {
      const router = new IntelligenceRouter(accessToken);
      const imgResponse = await fetch(selectedEditImage.url);
      const blob = await imgResponse.blob();
      const base64Img = await blobToBase64(blob);

      const response = await router.execute('CREATIVE_EDIT', 
        { parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Img } },
            { text: editPrompt }
        ]}
      );
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setEditedImage(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    } catch (err) { console.error("Editing failed", err); }
    finally { setIsProcessing(false); }
  };

  const handleGenerateVideo = async () => {
    if ((!videoPrompt.trim() && !videoReferenceImage) || !isOnline || !accessToken) return;
    setIsProcessing(true);
    try {
      const router = new IntelligenceRouter(accessToken);
      const operation = await router.generateVideo(
          videoPrompt || "Animate this restoration scene realistically",
          videoReferenceImage || undefined
      );

      let currentOp = operation;
      while (!currentOp.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        currentOp = await router.getOperationsClient().getVideosOperation({ operation: currentOp });
      }

      const downloadLink = currentOp.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${accessToken}`);
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

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-24' : ''} bg-gray-50 h-full flex flex-col`}>
      {/* Header Tabs */}
      <header className="px-4 pt-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
           <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gallery</h2>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Site Documentation</p>
           </div>
           <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
             <button onClick={() => setActiveTab('gallery')} className={`p-2.5 rounded-xl transition-all ${activeTab === 'gallery' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><ImageIcon size={20} /></button>
             <button onClick={() => setActiveTab('generate')} className={`p-2.5 rounded-xl transition-all ${activeTab === 'generate' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><Sparkles size={20} /></button>
             <button onClick={() => setActiveTab('video')} className={`p-2.5 rounded-xl transition-all ${activeTab === 'video' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><Film size={20} /></button>
           </div>
        </div>

        {activeTab === 'gallery' && (
          <div className="space-y-4 mb-4">
            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tags, or insights..."
                className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
              />
            </div>

            {/* Tag Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                {allTags.map(tag => (
                <button 
                  key={tag} 
                  onClick={() => setFilter(tag)} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filter === tag ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                >
                    {tag}
                </button>
                ))}
            </div>
          </div>
        )}
      </header>
      
      <main className="flex-1 overflow-y-auto px-4">
        {activeTab === 'gallery' && (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 pb-8">
              {filteredPhotos.map((photo) => (
              <div key={photo.id} className="break-inside-avoid mb-4 group rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative bg-gray-100 cursor-pointer aspect-square" onClick={() => { setSelectedEditImage(photo); setActiveTab('edit'); }}>
                      {photo.type === 'video' ? (
                          <div className="w-full h-full bg-black flex items-center justify-center text-white"><PlayCircle size={32} /></div>
                      ) : (
                          <img src={photo.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={photo.tags[0]} />
                      )}
                      <div className="absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                              onClick={(e) => { e.stopPropagation(); handleAnalyzePhoto(photo); }} 
                              className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-blue-600 shadow-lg hover:bg-white transition-colors"
                          >
                              {loadingPhotos.has(photo.id) ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                          </button>
                      </div>
                  </div>
                  <div className="p-4">
                     <div className="flex flex-wrap gap-1 mb-2">
                        {photo.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-[9px] font-black uppercase text-gray-500 rounded border border-gray-200">{t}</span>)}
                     </div>
                     <p className="text-xs text-gray-700 font-medium leading-relaxed line-clamp-3">{photo.notes || 'No documentation notes.'}</p>
                     
                     {photoInsights[photo.id] && (
                         <div className="mt-3 pt-3 border-t border-gray-50">
                             <p className="text-[10px] text-blue-600 font-bold leading-tight flex items-start">
                               <Sparkles size={10} className="mr-1.5 mt-0.5 shrink-0" />
                               {photoInsights[photo.id]}
                             </p>
                         </div>
                     )}
                  </div>
              </div>
              ))}
              {filteredPhotos.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <Search size={32} />
                  </div>
                  <p className="text-sm font-bold text-gray-500">No photos match your criteria.</p>
                </div>
              )}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="max-w-xl mx-auto space-y-6 pb-20">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Sparkles size={24}/></div>
                <div><h3 className="font-bold text-gray-900">AI Project Studio</h3><p className="text-xs text-gray-500 font-medium">Nano Banana Pro High-Fidelity</p></div>
              </div>
              
              <textarea 
                  value={genPrompt} 
                  onChange={e => setGenPrompt(e.target.value)} 
                  placeholder="Describe the professional restoration visualization..."
                  className="w-full h-32 bg-gray-50 rounded-2xl p-4 text-sm font-medium border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Resolution</label>
                  <select value={genSize} onChange={e => setGenSize(e.target.value)} className="w-full bg-gray-50 rounded-xl p-3 text-xs font-bold border border-gray-200">
                    <option value="1K">1K Balanced</option>
                    <option value="2K">2K Professional</option>
                    <option value="4K">4K Cinematic</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Aspect Ratio</label>
                  <select value={genAspectRatio} onChange={e => setGenAspectRatio(e.target.value)} className="w-full bg-gray-50 rounded-xl p-3 text-xs font-bold border border-gray-200">
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                    <option value="21:9">21:9 UltraWide</option>
                  </select>
                </div>
              </div>

              <button 
                  onClick={handleGenerateImage} 
                  disabled={isProcessing || !isOnline} 
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 shadow-xl active:scale-[0.98] transition-all disabled:bg-gray-400"
              >
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                <span>Synthesize Visual Asset</span>
              </button>
            </div>

            {generatedImage && (
              <div className="bg-white p-4 rounded-[2.5rem] border border-gray-200 shadow-2xl animate-in zoom-in-95 duration-500">
                <img src={generatedImage} className="w-full rounded-2xl shadow-lg" alt="Generated" />
                <div className="flex space-x-3 mt-6">
                  <button onClick={() => setGeneratedImage(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">Discard</button>
                  <button onClick={() => handleApplyGeneration(generatedImage!, 'image')} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20">Attach to Project</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit' && selectedEditImage && (
          <div className="max-w-xl mx-auto space-y-6 pb-20">
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-900">Generative Polish</h3>
                    <button onClick={() => setActiveTab('gallery')} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">Cancel</button>
                </div>
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 border border-gray-200 mb-6">
                  <img src={selectedEditImage.url} className="w-full h-full object-contain" alt="Original" />
                </div>
                <textarea 
                  value={editPrompt} 
                  onChange={e => setEditPrompt(e.target.value)} 
                  placeholder="e.g. 'Remove the yellow tape' or 'Add a retro cinematic filter'..."
                  className="w-full h-24 bg-gray-50 rounded-2xl p-4 text-sm font-medium border border-gray-200 mb-6 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                />
                <button 
                  onClick={handleEditImage} 
                  disabled={isProcessing || !isOnline} 
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                   {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                   <span>Run Intelligence Polish</span>
                </button>
             </div>
             {editedImage && (
                 <div className="bg-white p-4 rounded-[2.5rem] border border-gray-200 shadow-2xl animate-in zoom-in-95">
                     <img src={editedImage} className="w-full rounded-2xl mb-6 shadow-lg" alt="Edited" />
                     <div className="flex space-x-3">
                         <button onClick={() => setEditedImage(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">Discard</button>
                         <button onClick={() => handleApplyGeneration(editedImage!, 'image')} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20">Replace Original</button>
                     </div>
                 </div>
             )}
          </div>
        )}

        {activeTab === 'video' && (
          <div className="max-w-xl mx-auto space-y-6 pb-20">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6">
                  <div className="flex items-center space-x-3">
                      <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Film size={24}/></div>
                      <div><h3 className="font-bold text-gray-900">Veo Video Engine</h3><p className="text-xs text-gray-500 font-medium">Fast Generative Walkthroughs</p></div>
                  </div>

                  <textarea 
                    value={videoPrompt} 
                    onChange={e => setVideoPrompt(e.target.value)} 
                    placeholder="Describe the video scene or fly-through..."
                    className="w-full h-24 bg-gray-50 rounded-2xl p-4 text-sm font-medium border border-gray-200 focus:ring-2 focus:ring-purple-500/20 outline-none" 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select value={videoAspectRatio} onChange={e => setVideoAspectRatio(e.target.value)} className="bg-gray-50 text-gray-700 p-3 rounded-xl text-xs font-bold border border-gray-200">
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                    </select>
                    <button 
                      onClick={() => document.getElementById('vid-ref-upload')?.click()} 
                      className={`bg-gray-50 p-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition-all ${videoReferenceImage ? 'border-purple-500 text-purple-600 bg-purple-50' : 'border-gray-200 text-gray-500'}`}
                    >
                        <ImagePlus size={14} />
                        <span>{videoReferenceImage ? 'Source Set' : 'Reference Frame'}</span>
                    </button>
                    <input id="vid-ref-upload" type="file" className="hidden" accept="image/*" onChange={async (e) => {
                        if (e.target.files?.[0]) {
                            const base64 = await blobToBase64(e.target.files[0]);
                            setVideoReferenceImage(`data:image/png;base64,${base64}`);
                        }
                    }}/>
                  </div>

                  <button 
                      onClick={handleGenerateVideo} 
                      disabled={isProcessing || !isOnline} 
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 shadow-xl active:scale-[0.98] transition-all disabled:bg-gray-400"
                  >
                      {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Clapperboard size={20} />}
                      <span>Render Veo Simulation</span>
                  </button>
              </div>

              {generatedVideoUrl && (
                  <div className="bg-white p-4 rounded-[2.5rem] border border-gray-200 shadow-2xl animate-in zoom-in-95">
                      <video src={generatedVideoUrl} controls className="w-full rounded-2xl mb-6 shadow-lg aspect-video bg-black" />
                      <div className="flex space-x-3">
                          <button onClick={() => setGeneratedVideoUrl(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">Discard</button>
                          <button onClick={() => handleApplyGeneration(generatedVideoUrl!, 'video')} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20">Save to Project</button>
                      </div>
                  </div>
              )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PhotoDocumentation;
