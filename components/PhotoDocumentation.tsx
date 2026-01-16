
import React, { useState, useMemo, useRef } from 'react';
import { Camera, Plus, Search, Tag, Filter, Grid, Image as ImageIcon, Sparkles, BrainCircuit, Loader2, Wand2, XCircle, FileText, Share2, ChevronRight, Scan, Cuboid, Palette, Movie, Settings2, Video, Send, Check, X, Maximize2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { blobToBase64 } from '../utils/photoutils';

interface PhotoDocumentationProps {
  onStartScan: () => void;
}

const PhotoDocumentation: React.FC<PhotoDocumentationProps> = ({ onStartScan }) => {
  const [filter, setFilter] = useState('All');
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());
  const [suggestedTags, setSuggestedTags] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modal states
  const [editingPhoto, setEditingPhoto] = useState<any | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [showImageGen, setShowImageGen] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genAspectRatio, setGenAspectRatio] = useState('1:1');
  const [genSize, setGenSize] = useState('1K');
  const [isGenerating, setIsGenerating] = useState(false);

  const [animatingPhoto, setAnimatingPhoto] = useState<any | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStatus, setAnimationStatus] = useState('');

  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [videoInsight, setVideoInsight] = useState('');

  const [photos, setPhotos] = useState([
    { id: '1', url: 'https://picsum.photos/seed/mit1/400/400', tag: 'Source of Loss', timestamp: 'Oct 12, 08:30 AM', aiInsight: 'Class 3 Water Intrusion', type: 'image' },
    { id: '2', url: 'https://picsum.photos/seed/mit2/400/400', tag: 'Damage - Kitchen', timestamp: 'Oct 12, 09:15 AM', aiInsight: 'Category 2 (Grey Water)', type: 'image' },
    { id: '3', url: 'https://picsum.photos/seed/mit3/400/400', tag: 'Original Setup', timestamp: 'Oct 12, 11:00 AM', aiInsight: 'Optimal Placement Verified', type: 'image' },
  ]);
  
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const handleAnalyzePhoto = async (photoId: string, currentTag: string) => {
    setLoadingPhotos(prev => new Set(prev).add(photoId));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `As an IICRC S500 expert, suggest 3 highly specific technical tags for a water mitigation photo that is currently described as "${currentTag}".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["tags"]
          }
        }
      });
      const result = JSON.parse(response.text || '{"tags":[]}');
      setSuggestedTags(prev => ({ ...prev, [photoId]: result.tags }));
    } catch (error) {
      console.error("AI Analysis failed", error);
    } finally {
      setLoadingPhotos(prev => { const next = new Set(prev); next.delete(photoId); return next; });
    }
  };

  const handleEditImage = async () => {
    if (!editingPhoto || !editPrompt) return;
    setIsEditing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Remove data URI prefix for the API
      const base64Data = editingPhoto.url.includes('base64') 
        ? editingPhoto.url.split(',')[1] 
        : await (await fetch(editingPhoto.url)).blob().then(b => blobToBase64(b));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/png' } },
            { text: editPrompt }
          ]
        }
      });

      let editedUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          editedUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (editedUrl) {
        const newPhoto = { ...editingPhoto, url: editedUrl, id: Date.now().toString(), timestamp: 'Edited just now', aiInsight: `Modified: ${editPrompt}` };
        setPhotos(prev => [newPhoto, ...prev]);
        setEditingPhoto(null);
        setEditPrompt('');
      }
    } catch (error) {
      console.error("Image editing failed:", error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!genPrompt) return;
    setIsGenerating(true);
    try {
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

      let genUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          genUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (genUrl) {
        const newPhoto = { id: Date.now().toString(), url: genUrl, tag: 'AI Concept', timestamp: 'Generated now', aiInsight: `Prompt: ${genPrompt}`, type: 'image' };
        setPhotos(prev => [newPhoto, ...prev]);
        setShowImageGen(false);
        setGenPrompt('');
      }
    } catch (error) {
      console.error("Image generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnimateVeo = async () => {
    if (!animatingPhoto) return;
    setIsAnimating(true);
    setAnimationStatus('Connecting to Veo Field Core...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = animatingPhoto.url.includes('base64') 
        ? animatingPhoto.url.split(',')[1] 
        : await (await fetch(animatingPhoto.url)).blob().then(b => blobToBase64(b));

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: 'A cinematic walkthrough of this room showing water damage and moisture patterns',
        image: { imageBytes: base64Data, mimeType: 'image/png' },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });

      while (!operation.done) {
        setAnimationStatus('Processing video frames (this may take a minute)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);

      const newVideo = { id: Date.now().toString(), url: videoUrl, tag: 'Video Walkthrough', timestamp: 'Generated now', aiInsight: 'Veo-powered motion analysis complete.', type: 'video' };
      setPhotos(prev => [newVideo, ...prev]);
      setAnimatingPhoto(null);
    } catch (error) {
      console.error("Veo animation failed:", error);
    } finally {
      setIsAnimating(false);
      setAnimationStatus('');
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAnalyzingVideo(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = await blobToBase64(file);
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: { parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: "Analyze this site walkthrough video. List the primary rooms affected and the estimated depth of standing water if visible." }
          ] }
        });
        setVideoInsight(response.text || 'Video analyzed.');
        const newVid = { id: Date.now().toString(), url: URL.createObjectURL(file), tag: 'Site Video', timestamp: 'Just now', aiInsight: response.text, type: 'video' };
        setPhotos(prev => [newVid, ...prev]);
      } catch (err) {
        console.error("Video analysis failed:", err);
      } finally {
        setAnalyzingVideo(false);
      }
    }
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

  const handleDeleteTag = (photoId: string) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, tag: 'Untagged' } : p));
    setTagInputs(prev => ({ ...prev, [photoId]: 'Untagged' }));
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleVideoClick = () => videoInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const localUrl = URL.createObjectURL(file);
      setIsUploading(true);
      try {
        const base64Data = await blobToBase64(file);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: "Analyze this water mitigation photo. Provide a concise 'tag' (3-4 words max) and a brief 'insight'." }
            ] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { tag: { type: Type.STRING }, insight: { type: Type.STRING } },
                    required: ["tag", "insight"]
                }
            }
        });
        const result = JSON.parse(response.text);
        setPhotos(prev => [{ id: Date.now().toString(), url: localUrl, tag: result.tag, timestamp: 'Just now', aiInsight: result.insight, type: 'image' }, ...prev]);
      } catch (error) {
        console.error("AI Photo Analysis failed", error);
      } finally { setIsUploading(false); }
    }
  };
  
  const handleShare = async (title: string) => {
    if (navigator.share) await navigator.share({ title, text: `Review: ${title}` });
  };

  const availableTags = useMemo(() => ['All', ...Array.from(new Set(photos.map(p => p.tag)))], [photos]);
  const filteredPhotos = useMemo(() => filter === 'All' ? photos : photos.filter(p => p.tag === filter), [photos, filter]);

  return (
    <div className="p-4 space-y-6 pb-24">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
      <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />
      <header>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Field Intelligence</h2>
        <p className="text-sm text-gray-500 font-medium">Multimodal Site Documentation</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <button onClick={handleUploadClick} disabled={isUploading} className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group active:scale-[0.98] transition-all">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl mb-2 group-hover:scale-110 transition-transform"><Camera size={20} /></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Add Photo</span>
        </button>
        <button onClick={handleVideoClick} className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group active:scale-[0.98] transition-all">
          <div className="p-3 bg-red-50 text-red-500 rounded-2xl mb-2 group-hover:scale-110 transition-transform"><Video size={20} /></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Site Video</span>
        </button>
        <button onClick={() => setShowImageGen(true)} className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group active:scale-[0.98] transition-all">
          <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl mb-2 group-hover:scale-110 transition-transform"><Palette size={20} /></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">AI Visualizer</span>
        </button>
        <button onClick={onStartScan} className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group active:scale-[0.98] transition-all">
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl mb-2 group-hover:scale-110 transition-transform"><Scan size={20} /></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">3D Scan</span>
        </button>
      </section>

      {/* Photo Grid */}
      <div className="space-y-4">
        {filteredPhotos.map((photo) => (
          <div key={photo.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
            <div className="relative aspect-[4/3] bg-gray-100">
              {photo.type === 'video' ? (
                <video src={photo.url} className="w-full h-full object-cover" controls />
              ) : (
                <img src={photo.url} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-4 right-4 flex space-x-2">
                {photo.type === 'image' && (
                  <>
                    <button onClick={() => setEditingPhoto(photo)} className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/40"><Wand2 size={16} /></button>
                    <button onClick={() => setAnimatingPhoto(photo)} className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/40"><Movie size={16} /></button>
                  </>
                )}
                <button onClick={() => handleAnalyzePhoto(photo.id, photo.tag)} className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/40">
                  {loadingPhotos.has(photo.id) ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                </button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-black/40 backdrop-blur-md p-3 rounded-2xl">
                <p className="text-white text-[10px] font-bold">{photo.aiInsight || 'Analyzing site content...'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Imaging Modal */}
      {(showImageGen || editingPhoto || animatingPhoto) && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-end justify-center px-4 pb-10">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl">{showImageGen ? 'AI Site Visualizer' : editingPhoto ? 'AI Image Editor' : 'Veo Site Animator'}</h3>
              <button onClick={() => { setShowImageGen(false); setEditingPhoto(null); setAnimatingPhoto(null); }} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
            </div>

            {showImageGen && (
              <div className="space-y-6">
                <textarea value={genPrompt} onChange={e => setGenPrompt(e.target.value)} placeholder="Describe the reconstruction concept..." className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Aspect Ratio</label>
                    <select value={genAspectRatio} onChange={e => setGenAspectRatio(e.target.value)} className="w-full bg-gray-100 rounded-xl p-3 text-xs font-bold">
                      {['1:1', '3:4', '4:3', '9:16', '16:9'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Resolution</label>
                    <select value={genSize} onChange={e => setGenSize(e.target.value)} className="w-full bg-gray-100 rounded-xl p-3 text-xs font-bold">
                      {['1K', '2K', '4K'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleGenerateImage} disabled={isGenerating} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center space-x-2">
                  {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  <span>Generate Concepts</span>
                </button>
              </div>
            )}

            {editingPhoto && (
              <div className="space-y-6">
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100"><img src={editingPhoto.url} className="w-full h-full object-cover" /></div>
                <input value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g., 'Enhance lighting' or 'Highlight water line'" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium" />
                <button onClick={handleEditImage} disabled={isEditing} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center space-x-2">
                  {isEditing ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  <span>Apply AI Edit</span>
                </button>
              </div>
            )}

            {animatingPhoto && (
              <div className="space-y-6 text-center">
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100"><img src={animatingPhoto.url} className="w-full h-full object-cover" /></div>
                <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold leading-relaxed">
                  {animationStatus || 'Veo will generate a cinematic walkthrough based on this site photo.'}
                </div>
                <button onClick={handleAnimateVeo} disabled={isAnimating} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black flex items-center justify-center space-x-2">
                  {isAnimating ? <Loader2 size={20} className="animate-spin" /> : <Movie size={20} />}
                  <span>Generate Cinematic Walkthrough</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoDocumentation;
