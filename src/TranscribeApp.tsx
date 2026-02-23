import { useState, useRef, useEffect } from "react";

export function TranscribeApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState<string>("");
  const [status, setStatus] = useState<string>("Disconnected");
  
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState<string>("");
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const [isSwitching, setIsSwitching] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const connect = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => { setStatus("Connected"); wsRef.current = ws; };
    ws.onclose = () => { setStatus("Disconnected"); wsRef.current = null; };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "models":
          setAvailableModels(data.available);
          setDownloadedModels(data.downloaded);
          if (data.downloaded.length > 0 && !currentModel) setCurrentModel(data.downloaded[0]);
          break;
        case "download_progress":
          setDownloadProgress(prev => ({ ...prev, [data.model]: data.progress }));
          break;
        case "download_complete":
          setDownloadedModels(data.downloaded);
          setDownloadProgress(prev => { const n = { ...prev }; delete n[data.model]; return n; });
          break;
        case "switching_model": setIsSwitching(true); break;
        case "switched_model": setIsSwitching(false); setCurrentModel(data.model); break;
        case "partial": setLiveText(data.text); break;
        case "final": setLiveText(data.text); break;
        case "error": alert(data.message); setIsSwitching(false); break;
        case "reset": setLiveText(""); break;
      }
    };
  };

  useEffect(() => { connect(); return () => { wsRef.current?.close(); stopRecording(); }; }, []);

  const startRecording = async () => {
    if (isRecording || isSwitching) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsample(inputData, audioContext.sampleRate, 16000);
        const int16Data = new Int16Array(downsampled.length);
        for (let i = 0; i < downsampled.length; i++) {
          const s = Math.max(-1, Math.min(1, downsampled[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        wsRef.current.send(int16Data.buffer);
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsRecording(true);
      setLiveText("");
      wsRef.current?.send(JSON.stringify({ type: "reset" }));
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    scriptProcessorRef.current?.disconnect();
    audioContextRef.current?.close();
    setIsRecording(false);
  };

  const downsample = (buffer: Float32Array, inputSR: number, outputSR: number) => {
    if (inputSR === outputSR) return buffer;
    const ratio = inputSR / outputSR;
    const result = new Float32Array(Math.round(buffer.length / ratio));
    let oR = 0, oB = 0;
    while (oR < result.length) {
      const nextOB = Math.round((oR + 1) * ratio);
      let accum = 0, count = 0;
      for (let i = oB; i < nextOB && i < buffer.length; i++) { accum += buffer[i]; count++; }
      result[oR++] = accum / count;
      oB = nextOB;
    }
    return result;
  };

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    wsRef.current?.send(JSON.stringify({ type: "set_language", language: lang }));
  };

  const handleModelAction = (model: string) => {
    if (downloadedModels.includes(model)) wsRef.current?.send(JSON.stringify({ type: "switch_model", model }));
    else wsRef.current?.send(JSON.stringify({ type: "download_model", model }));
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Top Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Selection Glass */}
        <div className="lg:col-span-2 glass rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
              Neural Engine
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {downloadedModels.length} Models Ready
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {availableModels.map(model => {
              const isDL = downloadedModels.includes(model);
              const isCurr = currentModel === model;
              const prog = downloadProgress[model];
              const isDLing = prog !== undefined;

              return (
                <button
                  key={model}
                  onClick={() => !isCurr && !isDLing && handleModelAction(model)}
                  disabled={isSwitching || (isDLing && prog < 100)}
                  className={`relative p-3 rounded-2xl text-[11px] font-bold transition-all border flex flex-col items-center justify-center gap-2
                    ${isCurr 
                      ? "bg-indigo-500/10 border-indigo-500 text-white glow-indigo shadow-indigo-500/20" 
                      : isDL 
                        ? "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500" 
                        : "bg-transparent border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400"
                    }`}
                >
                  <span className="truncate w-full text-center tracking-tight uppercase">{model.replace('large-v3-', 'v3-')}</span>
                  {isDLing ? (
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-2xl overflow-hidden px-4">
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-400 h-full transition-all duration-300" style={{ width: `${prog}%` }} />
                      </div>
                    </div>
                  ) : null}
                  {isCurr && isSwitching ? <div className="absolute inset-0 bg-indigo-500/20 animate-pulse rounded-2xl"></div> : null}
                  {!isDL && !isDLing && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-40" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection Glass */}
        <div className="glass rounded-3xl p-6 shadow-2xl">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            Language
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { id: "en", label: "English", icon: "🇺🇸", native: "International" },
              { id: "ar", label: "Arabic", icon: "🇸🇦", native: "العربية" },
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => handleLanguageChange(lang.id)}
                className={`px-4 py-3 rounded-2xl transition-all border flex items-center justify-between group
                  ${currentLanguage === lang.id 
                    ? "bg-indigo-500/10 border-indigo-500 text-white glow-indigo shadow-indigo-500/20" 
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{lang.icon}</span>
                  <div className="text-left">
                    <div className="text-[12px] font-bold tracking-tight">{lang.label}</div>
                    <div className="text-[10px] opacity-40 font-medium">{lang.native}</div>
                  </div>
                </div>
                {currentLanguage === lang.id && (
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Transcription Console */}
      <div className="glass rounded-[2rem] p-1 shadow-2xl relative">
        <div className="bg-slate-900/40 rounded-[1.8rem] p-8 md:p-12 overflow-hidden relative">
          
          {/* Status Indicators */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800`}>
                <span className={`w-2 h-2 rounded-full ${status === "Connected" ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
                <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{status}</span>
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 animate-pulse-soft">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-red-400">Recording</span>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setLiveText("")}
              className="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              Clear Buffer
            </button>
          </div>

          {/* Transcript View */}
          <div className="relative min-h-[300px] flex flex-col justify-end">
            <div 
              className={`text-2xl md:text-3xl font-bold leading-[1.6] tracking-tight transition-all duration-500
                ${currentLanguage === "ar" ? "text-right" : "text-left"}`}
              dir={currentLanguage === "ar" ? "rtl" : "ltr"}
            >
              <span className="text-slate-200 drop-shadow-sm leading-relaxed">
                {liveText}
              </span>
              {!liveText && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                  <div className="text-center">
                    <div className="text-4xl mb-4">✨</div>
                    <div className="text-sm font-black uppercase tracking-[0.2em]">{currentLanguage === 'ar' ? 'بانتظار صوتك...' : 'Awaiting your voice...'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Record Button */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={status !== "Connected" || isSwitching || !currentModel}
              className="w-20 h-20 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 transition-all group disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95 transition-all glow-red"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
