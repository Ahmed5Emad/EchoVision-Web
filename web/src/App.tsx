import { TranscribeApp } from "./TranscribeApp";
import "./index.css";

export function App() {
  return (
    <div className="min-h-screen w-full py-12 px-4 md:px-8 flex flex-col items-center">
      {/* Header Section */}
      <header className="mb-12 text-center relative">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-xl backdrop-blur-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-linear-to-b from-white to-slate-400">
          WHISPER LIVE
        </h1>
        <p className="text-lg md:text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
          High-performance real-time transcription powered by <span className="text-indigo-400">CUDA</span> and <span className="text-slate-200">Bun</span>.
        </p>
      </header>

      <main className="w-full max-w-5xl relative z-10">
        <TranscribeApp />
      </main>

      <footer className="mt-20 text-slate-500 text-sm font-medium">
        Built with <span className="text-slate-400">whisper.node</span> &bull; RTX 3060 Optimized
      </footer>
    </div>
  );
}

export default App;
