# NDVI Crop Health Monitor

A precision satellite agriculture platform featuring dynamic farm boundary drawing, high-fidelity NDVI vegetation index analytics, SMAP soil moisture modeling, and Gemini AI-powered agronomic diagnostics.

---

## 📖 Short Description

**NDVI Crop Health Monitor** is a sophisticated, full-stack satellite spatial telemetry dashboard designed for progressive farmers, agronomists, and land stewards. It bridges state-of-the-art WebGIS spatial modeling with advanced generative AI, providing immediate land parcel stress diagnosis (nitrogen and water stress), anomaly detection, and actionable prescription guidance based on real-time atmospheric and remote sensing telemetry proxying.

---

## ✨ Key Features

- **🗺️ Interactive Boundary Drawing:** Draw farm coordinates directly on an interactive spatial canvas to compute raw surface acreage and coordinate bounds.
- **🛰️ Virtual Satellite Telemetry:** Retrieve mock multi-month Sentinel-2 NDVI (Normalized Difference Vegetation Index) and SMAP (Soil Moisture Active Passive) subsoil indicators mapped chronologically.
- **📈 Advanced Crop Health Analytics:** Compare current field curves against 10-year historical averages using rich, dynamic, interactive visualization charts (powered by Recharts).
- **🤖 Server-Side Gemini Diagnostics:** Safely analyze field telemetry against the `@google/genai` TypeScript SDK (using `gemini-2.5-flash`) via secure back-channel proxying to prevent API key exposure.
- **🔒 High-Standard Baseline Security:** Integrated HTTP security guards such as custom response headers, payload size limit enforcement (`1mb` JSON buffers), and input parameter sanitization routines to sanitize against injections.
- **📱 Responsive & Fluid Layout:** Engineered using semantic Tailwind CSS utilities prioritizing extreme contrast readability, space coordination, and micro-interactions.

---

## 🛠️ Security & Architecture

This application was developed prioritizing **architectural security**:
1. **Zero Client-Side Keys:** The user's Google GenAI API keys are kept entirely server-side. No browser requests contain sensitive keys.
2. **API Injection Defenses:** The Express backend parses and cleans inputs, validating bounds and sanitizing text formats before injecting telemetry metrics into Gemini prompts.
3. **HTTP Armor:** Custom response headers (`X-Content-Type-Options: nosniff`, `X-XSS-Protection`, etc.) together with the disabling of raw `X-Powered-By` headers block basic footprinting and framing exploits.

---

## ⚙️ Local Development Setup

To clone and run this application locally, follow these simple steps:

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Installation
Clone this repository to your local machine and install the dependencies:
```bash
git clone https://github.com/your-username/ndvi-crop-health-monitor.git
cd ndvi-crop-health-monitor
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory by copying the `.env.example` template:
```bash
cp .env.example .env
```
Open `.env` and fill in your private **Gemini API Key**:
```env
# Server-only Gemini API Secret (Keep confidential)
GEMINI_API_KEY="your_actual_gemini_api_key_goes_here"
```

### 3. Start Development Mode
Boot the full-stack development environment (runs Vite integrated cleanly under an Express middleware layer on port `3000`):
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` to preview the live workspace.

### 4. Build for Production
To bundle the frontend assets and compile the backend TypeScript server into an optimized single bundle:
```bash
npm run build
npm start
```
