
import React, { useState } from 'react';
import { BrainCircuit, ShieldCheck, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const OAuthHandler: React.FC = () => {
  const { setAuthentication } = useAppContext();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClientAuth = async () => {
    setIsAuthenticating(true);
    setError(null);
    
    // In a real app, this would be a fetch call to your backend token endpoint
    // which securely handles the client_id and client_secret exchange.
    // We simulate this with a timeout.
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success/failure
    const authSuccess = Math.random() > 0.1; // 90% success rate for demo

    if (authSuccess) {
      // On success, the token would be stored securely (e.g., in memory)
      // and the global app state is updated.
      setAuthentication(true);
    } else {
      setError("Authentication failed. The service could not be reached or credentials are invalid. Please try again.");
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-between p-8 max-w-md mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full" />
      
      <div className="relative z-10 w-full flex flex-col items-center text-center mt-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl mb-6 shadow-2xl shadow-blue-500/30 ring-1 ring-white/10">R</div>
        <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Restoration<span className="text-blue-500">AI</span></h1>
        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[280px]">Securely connecting to the AI Core via OAuth 2.0 Client Credentials.</p>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-6 text-center backdrop-blur-md">
              <div className="flex justify-center mb-4"><div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 shadow-lg"><Lock size={24} className="text-indigo-300" /></div></div>
              <h2 className="text-lg font-bold text-white mb-2">Service Authentication</h2>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">This application authenticates as a trusted service to securely access Google Cloud and Gemini APIs. No user sign-in is required.</p>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-xs p-3 rounded-lg mb-4 flex items-start space-x-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                onClick={handleClientAuth}
                disabled={isAuthenticating}
                className="w-full bg-white text-slate-900 h-14 rounded-2xl font-bold text-sm flex items-center justify-center space-x-3 shadow-2xl hover:bg-slate-50 active:scale-[0.98] transition-all ring-1 ring-slate-200 disabled:opacity-60"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    <span>Authorize Service</span>
                  </>
                )}
              </button>
              <p className="text-slate-500 text-[9px] text-center mt-4 font-bold uppercase tracking-widest">Client Credentials Grant</p>
          </div>
      </div>
      
      <div className="w-full text-center">
        <p className="text-slate-600 text-[10px] font-bold tracking-widest uppercase">
          Powered by Google Cloud & Gemini
        </p>
      </div>
    </div>
  );
};

export default OAuthHandler;
