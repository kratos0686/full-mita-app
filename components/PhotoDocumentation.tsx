
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
import { EventBus } from '../services/EventBus';

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
      const router = new IntelligenceRouter();
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
                }
            }
        }
      );

      const result = JSON.parse(response.text || '{}');
      if (result.tags) {
          setSuggestedTags(prev => ({ ...prev, [photo.id]: result.tags }));
      }
      if (result.insight) {
          setPhotoInsights(prev => ({ ...prev, [photo.id]: result.insight }));
          EventBus.publish('com.restorationai.log.entry', { message: `AI Insight for photo: ${result.insight}`, category: 'AI Vision' }, project.id, 'AI Insight Generated', 'info');
      }
      EventBus.publish('com.restorationai.notification', { title: 'Photo Analyzed', message: 'AI tagging complete' }, project.id, 'AI Tagging Complete', 'success');

    } catch (err) {
      console.error(err);
      EventBus.publish('com.restorationai.notification', { title: 'Analysis Failed', message: 'Could not process photo' }, project.id, 'Photo Analysis Failed', 'error');
    } finally {
      setLoadingPhotos(prev => {
          const next = new Set(prev);
          next.delete(photo.id);
          return next;
      });
    }
  };

  const handleCapture = () => {
      // Simulation of camera capture
      const newPhoto: PhotoItem = {
          id: `p-${Date.now()}`,
          url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800', // Mock wet wall photo
          timestamp: Date.now(),
          tags: ['Untagged'],
          notes: 'New site photo captured',
          type: 'image'
      };
      setPhotos([newPhoto, ...photos]);
      EventBus.publish('com.restorationai.log.entry', { message: 'New site photo captured', category: 'Documentation' }, project.id, 'New Photo Captured', 'info');
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-200">
        <header className="p-4 bg-slate-900 border-b border-white/5 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('gallery')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'gallery' ? 'bg-brand-cyan text-slate-900' : 'bg-white/5 text-slate-400'}`}>Gallery</button>
                <button onClick={() => setActiveTab('generate')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${activeTab === 'generate' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}><Sparkles size={12}/><span>AI Gen</span></button>
                <button onClick={() => setActiveTab('video')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${activeTab === 'video' ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-400'}`}><Video size={12}/><span>Veo</span></button>
            </div>
            <button onClick={handleCapture} className="p-2 bg-brand-cyan text-slate-900 rounded-full shadow-lg active:scale-95 transition-transform"><Camera size={20}/></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'gallery' && (
                <>
                    <div className="mb-4 flex space-x-2 overflow-x-auto no-scrollbar pb-2">
                        {allTags.map(tag => (
                            <button key={tag} onClick={() => setFilter(tag)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap border transition-all ${filter === tag ? 'bg-white text-slate-900 border-white' : 'bg-transparent text-slate-500 border-slate-700'}`}>{tag}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {filteredPhotos.map(photo => (
                            <div key={photo.id} className="relative group rounded-2xl overflow-hidden aspect-square bg-slate-900 border border-white/10">
                                <img src={photo.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-xs text-white font-medium truncate">{photo.notes}</p>
                                    <div className="flex space-x-2 mt-2">
                                        <button onClick={() => handleAnalyzePhoto(photo)} disabled={loadingPhotos.has(photo.id)} className="p-2 bg-indigo-600 rounded-lg text-white disabled:opacity-50">
                                            {loadingPhotos.has(photo.id) ? <Loader2 size={14} className="animate-spin"/> : <BrainCircuit size={14} />}
                                        </button>
                                    </div>
                                </div>
                                {photoInsights[photo.id] && (
                                    <div className="absolute top-2 right-2 p-1.5 bg-indigo-500 rounded-full text-white shadow-lg animate-in zoom-in">
                                        <Sparkles size={12} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
            
            {(activeTab === 'generate' || activeTab === 'video') && (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">Feature module simulated.</div>
            )}
        </div>
    </div>
  );
};

export default PhotoDocumentation;
