# Zerra.ai - ChatPDF SaaS Platform

<div align="center">
  
**🚀 Modern B2B SaaS for Conversational PDF Intelligence**

*Powered by FastAPI • ChromaDB • DeepSeek LLM • React*

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35?style=for-the-badge&logo=database&logoColor=white)](https://www.trychroma.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)

</div>

---

## 📋 Table of Contents

- [🎯 Project Overview](#-project-overview)
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [💡 Application Demo](#-application-demo)
- [🛠️ Technology Stack](#️-technology-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [🔌 API Documentation](#-api-documentation)
- [🎨 UI/UX Design](#-uiux-design)
- [🤖 AI & RAG Implementation](#-ai--rag-implementation)
- [👨‍💻 Developer](#-developer)

---

## 🎯 Project Overview

**Zerra.ai** is a production-ready, enterprise-grade SaaS platform that revolutionizes document interaction through conversational AI. Built with modern technologies and best practices, it enables users to upload multiple PDF documents and engage in intelligent conversations to extract insights, summaries, and specific information.

This project demonstrates advanced skills in **full-stack development**, **AI integration**, **system architecture**, and **production deployment** - making it ideal for showcasing technical expertise to potential employers.

### 🏆 Why This Project Stands Out

- **Production-Ready Architecture**: Built with scalability and maintainability in mind
- **Advanced AI Integration**: Implements RAG (Retrieval-Augmented Generation) for accurate responses
- **Modern Tech Stack**: Uses cutting-edge technologies and frameworks
- **Professional UI/UX**: Custom-designed interface following modern SaaS design principles
- **Comprehensive Documentation**: Well-documented codebase with clear API specifications

---

## ✨ Key Features

### 🔄 Core Functionality
- **Multi-file PDF Upload** with drag-and-drop interface and real-time progress tracking
- **Intelligent Document Processing** with text extraction and chunking algorithms
- **Conversational AI Chat** powered by DeepSeek LLM for natural language interactions
- **Vector-based Document Search** using ChromaDB for semantic similarity matching
- **Real-time Status Updates** for document processing and chat responses

### 🎯 Technical Highlights
- **RESTful API Design** with comprehensive endpoint documentation
- **Asynchronous Processing** for handling large document uploads
- **Vector Embeddings** for semantic document understanding
- **Responsive Design** optimized for desktop and mobile devices
- **Error Handling & Validation** with comprehensive status reporting

### 🔒 Enterprise Features
- **Scalable Architecture** designed for high-volume usage
- **Modular Codebase** for easy maintenance and feature additions
- **Performance Optimized** with efficient chunking and retrieval algorithms
- **Clean Code Practices** following industry standards and best practices

---

## 🏗️ System Architecture

The platform follows a modern microservices architecture with clear separation of concerns:

![System Architecture of ChatPDF](https://raw.githubusercontent.com/Ridh1234/ChatPDF/main/System%20architecture%20of%20chatpdf.png)

### 📊 Application Workflow

Below is the complete system workflow showing how documents are processed and chat interactions are handled:

![Sequence Diagram](https://raw.githubusercontent.com/Ridh1234/ChatPDF/main/Sequence%20diagram.png)

**Key Workflow Components:**

#### 📤 PDF Upload & Processing Flow
1. **User Upload**: Multi-file PDF upload through React frontend
2. **Document Processing**: FastAPI backend extracts and chunks text content
3. **Vector Generation**: Text segments converted to embeddings using Hugging Face models
4. **Storage**: Document vectors stored in ChromaDB with metadata
5. **Status Updates**: Real-time processing status returned to frontend

#### 💬 Chat Interaction Flow
1. **Query Processing**: User questions processed through FastAPI endpoint
2. **Semantic Search**: ChromaDB performs vector similarity search
3. **Context Building**: Relevant document chunks retrieved and formatted
4. **AI Response**: DeepSeek LLM generates contextual responses using RAG
5. **Response Streaming**: AI answers streamed back to user interface

#### 📊 Status Monitoring
- Real-time document processing status tracking
- Error handling and recovery mechanisms
- Performance monitoring and analytics

---

## 💡 Application Demo

### 🖥️ User Interface

Experience the modern, intuitive interface designed for professional document interaction:

![ChatPDF Interface](https://raw.githubusercontent.com/Ridh1234/ChatPDF/main/Chatpdf%20interface.png)

**Interface Highlights:**
- **Clean, Professional Design**: Modern SaaS-style interface with intuitive navigation
- **Dark Theme**: Eye-friendly dark mode for extended usage sessions
- **Real-time Chat**: Smooth, responsive chat interface similar to ChatGPT
- **Document Management**: Easy-to-use document upload and management system
- **Status Indicators**: Clear visual feedback for all user actions

### 🎯 Key User Features

**📁 Document Management**
- Drag-and-drop PDF upload with progress indicators
- Multiple document support with individual processing status
- Document preview and metadata display

**💬 Intelligent Conversations**
- Natural language querying of document content
- Context-aware responses with source attribution  
- Chat history preservation and management

**⚡ Real-time Updates**
- Live processing status updates
- Instant response streaming
- Error handling with user-friendly messaging

---

## 🛠️ Technology Stack

### 🎨 Frontend Technologies
```
├── React 18.x          # Modern UI library with hooks
├── Vite               # Fast build tool and dev server
├── CSS Modules        # Scoped styling approach
├── Custom Animations  # Smooth transitions and interactions
└── Responsive Design  # Mobile-first approach
```

### ⚙️ Backend Technologies
```
├── FastAPI           # High-performance Python web framework
├── Python 3.11+      # Latest Python with type hints
├── Pydantic          # Data validation and serialization
├── Asyncio           # Asynchronous programming support
└── Uvicorn           # ASGI server for production
```

### 🤖 AI & Data Technologies
```
├── ChromaDB          # Vector database for embeddings
├── DeepSeek LLM      # Large language model via Hugging Face
├── Sentence Transformers  # Text embedding generation
├── PyPDF2            # PDF text extraction
└── Langchain         # LLM application framework
```

### 🏗️ Infrastructure & Tools
```
├── Docker            # Containerization for deployment
├── Git               # Version control with clear commit history
├── Environment Config # Secure configuration management
└── API Documentation # Comprehensive endpoint documentation
```

---

## 📁 Project Structure

```
Zerra.ai/
├── 📂 Backend/                 # FastAPI Application
│   ├── 📂 app/
│   │   ├── 📂 api/            # API routes and endpoints
│   │   │   ├── __init__.py
│   │   │   ├── chat.py        # Chat conversation endpoints
│   │   │   └── upload.py      # File upload endpoints
│   │   ├── 📂 core/           # Core application logic
│   │   │   ├── config.py      # Configuration management
│   │   │   ├── database.py    # ChromaDB connection
│   │   │   └── llm.py         # LLM integration
│   │   ├── 📂 services/       # Business logic services
│   │   │   ├── pdf_processor.py  # PDF processing logic
│   │   │   ├── embeddings.py    # Vector embedding service
│   │   │   └── chat_service.py  # Chat logic and RAG
│   │   ├── 📂 models/         # Pydantic data models
│   │   │   ├── requests.py    # API request models
│   │   │   └── responses.py   # API response models
│   │   └── main.py           # FastAPI application entry
│   ├── 📄 requirements.txt    # Python dependencies
│   ├── 📄 Dockerfile         # Container configuration
│   └── 📄 .env.example       # Environment variables template
│
├── 📂 Frontend/               # React Application
│   ├── 📂 src/
│   │   ├── 📂 components/     # Reusable UI components
│   │   │   ├── Chat/         # Chat interface components
│   │   │   ├── Upload/       # File upload components
│   │   │   └── Common/       # Shared UI elements
│   │   ├── 📂 hooks/         # Custom React hooks
│   │   ├── 📂 services/      # API service functions
│   │   ├── 📂 styles/        # CSS modules and themes
│   │   ├── 📄 App.jsx        # Main application component
│   │   └── 📄 main.jsx       # React DOM entry point
│   ├── 📄 package.json       # Node.js dependencies
│   ├── 📄 vite.config.js     # Vite configuration
│   └── 📄 index.html         # HTML template
│
├── 📂 docs/                   # Documentation and assets
│   ├── 📷 screenshots/       # Application screenshots
│   ├── 📊 diagrams/          # Architecture diagrams
│   └── 📋 api-docs.md        # API documentation
│
├── 📄 README.md              # Project documentation
├── 📄 docker-compose.yml     # Multi-container setup
└── 📄 .gitignore            # Git ignore rules
```

---

## 🚀 Quick Start Guide

### 📋 Prerequisites

- **Python 3.11+** with pip package manager
- **Node.js 18+** with npm
- **Git** for version control
- **Hugging Face API Key** for LLM access

### ⚡ Installation Steps

#### 1️⃣ Clone Repository
```bash
git clone https://github.com/yourusername/zerra-ai.git
cd zerra-ai
```

#### 2️⃣ Backend Setup
```bash
# Navigate to backend directory
cd Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys and configuration
```

#### 3️⃣ Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd Frontend

# Install Node.js dependencies
npm install

# Start development server
npm run dev
```

#### 4️⃣ Start Backend Server
```bash
# From Backend directory with activated virtual environment
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 🌐 Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

## 🔌 API Documentation

### 📤 Upload Endpoints

#### Upload Multiple PDFs
```http
POST /api/v1/upload-multi
Content-Type: multipart/form-data

Request Body:
- files: List of PDF files
- metadata: Optional document metadata

Response:
{
  "status": "success",
  "document_ids": ["doc_1", "doc_2"],
  "processing_status": "in_progress"
}
```

#### Check Processing Status
```http
GET /api/v1/status/{document_id}

Response:
{
  "document_id": "doc_1",
  "status": "completed",
  "progress": 100,
  "chunks_processed": 45,
  "embeddings_generated": 45
}
```

### 💬 Chat Endpoints

#### Send Chat Message
```http
POST /chat
Content-Type: application/json

Request Body:
{
  "message": "What are the key findings in the uploaded documents?",
  "document_ids": ["doc_1", "doc_2"],
  "conversation_id": "conv_123"
}

Response:
{
  "response": "Based on the documents, the key findings are...",
  "sources": [
    {
      "document_id": "doc_1",
      "chunk_id": "chunk_5",
      "relevance_score": 0.89
    }
  ],
  "conversation_id": "conv_123"
}
```

### 🔍 Additional Endpoints

- `GET /health` - Health check endpoint
- `GET /api/v1/documents` - List uploaded documents
- `DELETE /api/v1/documents/{doc_id}` - Delete document
- `GET /api/v1/conversations/{conv_id}` - Retrieve conversation history

**⭐ If you found this project impressive, please consider starring the repository!**

</div>
