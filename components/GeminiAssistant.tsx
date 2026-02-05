
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, Zap, BookOpen, AlertCircle, Mic, MicOff, Volume2, Loader2, Brain, VolumeX, WifiOff, FileAudio } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import { encode, decode, decodeAudioData } from '../utils/audio';

interface GeminiAssistantProps {
  context: string;
  isOpen: boolean;
  onClose: () => void;
}

const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ context, isOpen, onClose }) => {
  const { isOnline } = useAppContext();
  const [input, setInput] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: `Mitigation™ AI Assistant ready for ${context}.` }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    if (!isOnline && isOpen) {
      setMessages(prev => [...prev, { role: 'ai', text: "I am currently offline. Please reconnect to access AI intelligence." }]);
      if (isLive) stopLive();
    }
  }, [isOnline, isOpen]);

  useEffect(() => {
    return () => {
        stopLive();
    }
  }, []);

  const stopLive = () => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    setIsLive(false);
    setIsRecording(false);
  };

  const createBlob = (data: Float32Array): { data: string, mimeType: string } => {
      const l = data.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
      }
      return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
      };
  }

  const startLive = async () => {
    if (!isOnline) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
              },
              systemInstruction: `You are an expert Water Mitigation Assistant helping a technician in the field. The current context is ${context}. Keep answers brief and technical.`,
          },
          callbacks: {
              onopen: () => {
                  console.log("Gemini Live Connected");
                  setIsLive(true);
                  setIsRecording(true);
                  
                  if (!inputAudioContextRef.current) return;
                  const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                  const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                  
                  scriptProcessor.onaudioprocess = (e) => {
                      const inputData = e.inputBuffer.getChannelData(0);
                      const pcmData = createBlob(inputData);
                      sessionPromise.then(session => {
                          session.sendRealtimeInput({ media: pcmData });
                      });
                  };
                  
                  source.connect(scriptProcessor);
                  scriptProcessor.connect(inputAudioContextRef.current.destination);
              },
              onmessage: async (msg: LiveServerMessage) => {
                  if (!outputAudioContextRef.current) return;

                  const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (base64Audio) {
                      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                      const audioBuffer = await decodeAudioData(
                          decode(base64Audio),
                          outputAudioContextRef.current,
                          24000,
                          1
                      );
                      const source = outputAudioContextRef.current.createBufferSource();
                      source.buffer = audioBuffer;
                      source.connect(outputNode);
                      source.addEventListener('ended', () => {
                          sourcesRef.current.delete(source);
                      });
                      source.start(nextStartTimeRef.current);
                      nextStartTimeRef.current += audioBuffer.duration;
                      sourcesRef.current.add(source);
                  }
                  
                  if (msg.serverContent?.interrupted) {
                       for (const source of sourcesRef.current) {
                           source.stop();
                       }
                       sourcesRef.current.clear();
                       nextStartTimeRef.current = 0;
                  }
              },
              onclose: () => {
                  setIsLive(false);
              },
              onerror: (e) => {
                  console.error("Gemini Live Error", e);
                  setIsLive(false);
              }
          }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
        console.error("Failed to start Live session", err);
    }
  };

  const handleSendMessage = async () => {
      if (!input.trim() || !isOnline) return;
      
      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsTyping(true);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Context: ${context}. Question: ${userMsg}`,
          });
          setMessages(prev => [...prev, { role: 'ai', text: response.text || "No response." }]);
      } catch (err) {
          setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to AI." }]);
      } finally {
          setIsTyping(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-end p-4 md:p-6">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 w-full max-w-md h-[500px] rounded-[2rem] shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
        
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-indigo-900/50 to-slate-900">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                   {isLive ? <div className="w-3 h-3 bg-white rounded-full animate-ping" /> : <Bot className="text-white" size={24} />}
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Mitigation Assistant</h3>
                    <div className="flex items-center space-x-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{isLive ? 'Live Voice Active' : isOnline ? 'Gemini 3 Flash' : 'Offline'}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-1">
                <button onClick={isLive ? stopLive : startLive} className={`p-2 rounded-lg transition-all ${isLive ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                    {isLive ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-slate-800 rounded-2xl rounded-bl-none p-3 border border-white/5 flex space-x-1">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 bg-slate-900 border-t border-white/10">
            <div className="relative">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isLive ? "Listening..." : "Ask Gemini about this project..."}
                    disabled={isLive || !isOnline}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLive || !isOnline}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg disabled:opacity-0 transition-opacity"
                >
                    <Send size={16} />
                </button>
            </div>
            {isLive && (
                 <div className="mt-2 flex items-center justify-center space-x-2 text-[10px] text-indigo-400 font-mono animate-pulse">
                    <Volume2 size={12} />
                    <span>Real-time Audio Streaming</span>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default GeminiAssistant;
