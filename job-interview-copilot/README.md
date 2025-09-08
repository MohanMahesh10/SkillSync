# Job Interview Copilot (Svelte + Vite + Tailwind)

A Svelte app to help you practice interviews with:
- API key entry and validation (Gemini)
- Resume parsing (PDF/DOCX)
- Interview session: live transcript (Web Speech API) + AI answers
- Practice mode: generate questions + evaluate spoken answers
- GitHub Pages deployment workflow

## Run locally
```bash
cd job-interview-copilot
npm install
npm run dev
```
Open the URL shown (typically http://localhost:5173).

## Build & preview
```bash
npm run build
npm run preview
```

## Get a Gemini API key
Create one in Google AI Studio: https://aistudio.google.com/
Paste it on the entry page to proceed. The key is stored in local storage until cleared.

## Deploy (GitHub Pages)
- Vite base path is set in `vite.config.js` (defaults to `/job-interview-copilot/`).
- Push to `main` and `.github/workflows/deploy.yml` will publish the `dist` folder to `gh-pages`.
