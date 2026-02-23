# Whisper Live - Real-time Streaming Transcription

A high-performance, real-time streaming transcription web application built with **Bun**, **React**, and **whisper.cpp**. This app provides a seamless, low-latency experience for transcribing live audio directly in your browser.

## 🌟 Features

- 🎙️ **Live Streaming:** Real-time transcription via WebSockets with a rolling audio window.
- ⚡ **Hardware Accelerated:** Automatically utilizes NVIDIA GPUs (via CUDA) or Apple Silicon (CoreML) when available, with a fast CPU fallback.
- 🌍 **Multilingual Support:** Transcribe in multiple languages, with dedicated English and Arabic support (including RTL UI).
- 📦 **Model Manager:** Download and switch between Whisper models (Tiny to Large v3 Turbo) directly from the UI.
- 💎 **Modern Interface:** A beautiful glassmorphism UI with real-time progress tracking and performance metrics.

## 🛠️ Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Frontend:** React, Tailwind CSS
- **Backend:** Bun.serve (WebSockets & HTTP)
- **Engine:** `@fugood/whisper.node` (Native bindings for whisper.cpp)

## 📋 Prerequisites

- **Bun:** [Install Bun](https://bun.sh)
- **Hardware:** 
  - **NVIDIA Users:** CUDA Toolkit installed for GPU acceleration.
  - **Mac Users:** Optimized for Apple Silicon.
  - **Other:** Works on standard CPUs (Windows, Linux, macOS).

## 🚀 Quick Start (Windows, Linux, macOS)

1. **Install Dependencies:**
   ```bash
   bun install
   ```

2. **Start the App:**
   ```bash
   bun dev
   ```

## 🔧 Advanced: Manual Compilation

### Linux/macOS
```bash
cd node_modules/@fugood/whisper.node
mkdir build && cd build
cmake .. -DGGML_CUDA=ON -DCUDAToolkit_ROOT=/opt/cuda -DCMAKE_CUDA_COMPILER=/opt/cuda/bin/nvcc
make -j$(nproc)
cp index.node ../lib/index.node
```

### Windows (NVIDIA GPU)
1. Install [Visual Studio](https://visualstudio.microsoft.com/vs/community/) (check "Desktop development with C++").
2. Install [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads).
3. Run the following in **Developer PowerShell for VS**:
```powershell
cd node_modules/@fugood/whisper.node
mkdir build; cd build
cmake .. -G "Visual Studio 17 2022" -DGGML_CUDA=ON
cmake --build . --config Release
copy Release\index.node ..\lib\index.node
```

## 📖 Usage Guide

- **Model Chooser:** The first time you use a model, click **Download**. It will be saved locally in the `/models` folder.
- **Language Switch:** Toggle between English and Arabic. The UI will automatically adjust its layout (LTR/RTL).
- **Performance Logs:** Check your terminal to see how fast your hardware is transcribing (e.g., `0.1s processing for 1.5s audio`).

## 📈 Performance (Tested)

On an **NVIDIA GeForce RTX 3060 Laptop GPU** (CUDA 13.1):
- **Processing Time:** ~0.05s - 0.2s for 1.5s of audio.
- **Model Used:** `tiny.en` and `base`.
- **Latency:** Near-instantaneous streaming updates with no perceived lag.

## ⚖️ License
MIT - Built with whisper.cpp and Bun.
