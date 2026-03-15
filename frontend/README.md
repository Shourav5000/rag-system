# RAG Document AI — LLM Integration

A full-stack Retrieval-Augmented Generation (RAG) system that lets you upload any PDF 
and ask questions about it using Anthropic's Claude API and LangChain.

## Live Demo
- **Frontend:** https://Shourav5000.github.io/rag-system
- **Backend:** https://rag-backend.onrender.com

## Architecture
```
PDF Upload → LangChain Text Splitter → HuggingFace Embeddings
    → ChromaDB Vector Store → Semantic Search
    → Claude LLM → Answer with Sources
```

## Tech Stack
- **Frontend:** React, CSS, GitHub Pages
- **Backend:** Python, Flask, Render
- **AI Framework:** LangChain (LCEL)
- **LLM:** Anthropic Claude (claude-sonnet-4-6)
- **Embeddings:** HuggingFace (all-MiniLM-L6-v2)
- **Vector Store:** ChromaDB
- **PDF Processing:** PyPDF

## Features
- Drag and drop PDF upload
- Document chunking and vector indexing
- Semantic search across document chunks
- AI answers with source citations
- Supports resumes, research papers, contracts, any PDF
- Fully deployed frontend + backend

## How RAG Works
1. PDF is split into chunks (1000 chars with 200 overlap)
2. Each chunk is converted to a vector using HuggingFace embeddings
3. Vectors stored in ChromaDB
4. User question converted to vector
5. Top 4 most similar chunks retrieved
6. Claude reads chunks and generates accurate answer

## Local Setup

### Backend
```bash
pip install flask flask-cors anthropic langchain langchain-anthropic langchain-community langchain-text-splitters chromadb pypdf python-dotenv sentence-transformers
```
Create `.env`:
```
ANTHROPIC_API_KEY=your-key-here
```
```bash
python rag_api.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Deployment
- **Frontend** deployed on GitHub Pages via `gh-pages`
- **Backend** deployed on Render (auto-deploys on push to main)