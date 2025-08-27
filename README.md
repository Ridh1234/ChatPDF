# Zerra.ai – ChatPDF SaaS Platform

![Zerra.ai Banner](https://user-images.githubusercontent.com/placeholder/banner.png)

<p align="center">
  <b>Modern B2B SaaS for Conversational PDF Intelligence</b><br>
  <i>Powered by FastAPI, ChromaDB, DeepSeek LLM, and a Premium React Frontend</i>
</p>

---

## 🚀 Overview
Zerra.ai is a production-ready, premium SaaS platform that enables users to upload, chat with, and extract insights from their PDFs using advanced AI. Inspired by ChatGPT, it features a beautiful, modern UI and robust backend for seamless PDF intelligence.

---

## ✨ Features
- **Multi-file PDF Upload** with real-time status tracking
- **Conversational Chat** with uploaded documents (ChatGPT-like experience)
- **FastAPI Backend** with RAG (Retrieval-Augmented Generation)
- **ChromaDB** for vector storage and retrieval
- **DeepSeek LLM** via Hugging Face router
- **Premium React Frontend** (no Tailwind, custom SaaS design)
- **Responsive & Accessible** UI/UX
- **Production-Ready** codebase

---

## 🖥️ Tech Stack
- **Frontend:** React (Vite), CSS Modules, Inline Styles, App.css Animations
- **Backend:** FastAPI, ChromaDB, Python
- **AI:** DeepSeek LLM (Hugging Face), RAG
- **Storage:** ChromaDB

---

## 📦 Project Structure
```
Zerra.ai/
├── Backend/        # FastAPI backend, PDF processing, ChromaDB, LLM integration
│   ├── app/
│   ├── requirements.txt
│   └── ...
├── Frontend/       # React frontend, premium SaaS UI, chat & upload features
│   ├── src/
│   ├── index.html
│   └── ...
└── README.md
```

---

## ⚡ Quickstart
### 1. Backend Setup
```bash
cd Backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit .env with your keys
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```

---

## 🔗 API Endpoints
- `POST /api/v1/upload-multi` – Multi-file PDF upload
- `GET  /api/v1/status/{docId}` – Upload & processing status
- `POST /chat` – Conversational chat endpoint

---

## 🎨 UI/UX Highlights
- Premium gradients, shadows, and smooth transitions
- Professional typography and spacing
- Responsive layouts (Flexbox, CSS Grid)
- Interactive feedback for all actions
- Clean, maintainable code (no Tailwind CSS)

---

## 🤖 AI & RAG
- Uses DeepSeek LLM via Hugging Face
- Embedding & retrieval with ChromaDB
- RAG pipeline for accurate document Q&A

---

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.

---

## 👤 Author
**Hridyansh Sharma**  
[LinkedIn](https://linkedin.com/in/hridyansh-sharma) · [GitHub](https://github.com/your-github)

---

<p align="center"><b>✨ Zerra.ai – Chat with your PDFs, intelligently. ✨</b></p>
