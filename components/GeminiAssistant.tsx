
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, Zap, BookOpen, AlertCircle, Mic, MicOff, Volume2, Loader2, Brain, VolumeX } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

interface GeminiAssistantProps {
  context: string;
  isOpen: boolean;
  onClose: () => void;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
  }
  return buffer;
}

const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ context, isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: `Mitigation™ AI Assistant ready for ${context}.` }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);

  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopLive = () => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (inputAudioContextRef.current) { inputAudioContextRef.current.close(); inputAudioContextRef.current = null; }
    setIsLive(false);
  };

  const startLive = async () => {
    setIsTyping(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLive(true); setIsTyping(false);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) { int16[i] = inputData[i] * 32768; }
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                const buffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = buffer; source.connect(outputAudioContextRef.current.destination);
                source.start(nextStartTimeRef.current); nextStartTimeRef.current += buffer.duration;
            }
          },
          onclose: () => setIsLive(false),
          onerror: () => setIsLive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `S500 Field Expert for ${context}. Be technical and concise.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { console.error(err); setIsTyping(false); }
  };

  const playTts = async (text: string) => {
    setIsTtsPlaying(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const ctx = new AudioContext({ sampleRate: 24000 });
        const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer; source.connect(ctx.destination);
        source.start();
        source.onended = () => setIsTtsPlaying(false);
      }
    } catch (err) { setIsTtsPlaying(false); }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input; setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
        contents: userMsg,
        config: useThinking ? { thinkingConfig: { thinkingBudget: 32768 } } : {}
      });
      setMessages(prev => [...prev, { role: 'ai', text: response.text || "" }]);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col justify-end">
      <div className="bg-white rounded-t-[3rem] h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom">
        <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-900 text-white rounded-t-[3rem] flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Sparkles className={isLive ? 'animate-pulse' : ''} />
            <div><h3 className="font-black">Mitigation Expert</h3><p className="text-[10px] uppercase font-black opacity-60">IICRC Live Link</p></div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-3xl text-sm max-w-[85%] ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                {m.text}
                {m.role === 'ai' && <button onClick={() => playTts(m.text)} className="ml-2 opacity-40 hover:opacity-100"><Volume2 size={14} /></button>}
              </div>
            </div>
          ))}
          {isTyping && <div className="text-xs text-gray-400 italic">Expert is analyzing field data...</div>}
        </div>

        <div className="p-6 bg-gray-50 space-y-4 rounded-b-[3rem] pb-10">
          <div className="flex space-x-2">
            <button onClick={() => setUseThinking(!useThinking)} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 border-2 ${useThinking ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100'}`}><Brain size={14} /><span>Thinking Mode</span></button>
            <button onClick={isLive ? stopLive : startLive} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 ${isLive ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white'}`}>{isLive ? <MicOff size={14} /> : <Mic size={14} />}<span>{isLive ? 'End Voice' : 'Voice Consult'}</span></button>
          </div>
          <div className="relative">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask field question..." className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-sm font-bold shadow-sm" />
            <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl"><Send size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiAssistant;
