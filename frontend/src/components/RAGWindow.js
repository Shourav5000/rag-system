import { useState, useRef, useEffect } from 'react';
import './RAGWindow.css';

const BACKEND_URL = 'https://rag-system-bx71.onrender.com';

export default function RAGWindow() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `👋 Welcome to RAG Document AI! Here's how to get started:

1. 📄 Upload any PDF using the drop zone above
2. ⏳ Wait a few seconds while the document is processed  
3. 💬 Ask any question about your document
4. 🔍 I'll find the most relevant sections and answer accurately

Try it with a resume, research paper, contract, or any PDF!` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docLoaded, setDocLoaded] = useState(false);
  const [docName, setDocName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const uploadFile = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) {
      alert('Please upload a PDF file');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      setDocLoaded(true);
      setDocName(file.name);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ "${file.name}" loaded! Split into ${data.chunks} chunks and indexed. What would you like to know?`
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to upload. The server may be waking up — please try again in 30 seconds.'
      }]);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFile(e.dataTransfer.files[0]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`${BACKEND_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.answer,
          sources: data.sources
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Connection error. The server may be waking up — please try again in 30 seconds.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rag-shell">
      <div className="rag-header">
        <div className="header-icon">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="header-info">
          <h1>RAG Document AI</h1>
          <span>{docLoaded ? `📄 ${docName}` : 'No document loaded'}</span>
        </div>
        <div className={`status-dot ${docLoaded ? 'active' : ''}`} />
      </div>

      {!docLoaded && (
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => uploadFile(e.target.files[0])}
          />
          {uploading ? (
            <div className="upload-loading">
              <div className="spinner" />
              <p>Processing document...</p>
            </div>
          ) : (
            <>
              <div className="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="upload-title">Drop your PDF here</p>
              <p className="upload-sub">or click to browse</p>
            </>
          )}
        </div>
      )}

      <div className="messages-area">
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>
            {msg.role === 'assistant' && <div className="msg-icon">AI</div>}
            <div className="msg-content">
              <div className={`bubble ${msg.role}`} style={{ whiteSpace: 'pre-line' }}>
                {msg.content}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources">
                  <p className="sources-label">Sources used</p>
                  {msg.sources.map((s, j) => (
                    <div key={j} className="source-chip">
                      <span className="source-page">Page {s.page}</span> — {s.preview}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="msg-icon">AI</div>
            <div className="bubble assistant typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-row">
        {docLoaded && (
          <button
            className="reupload-btn"
            onClick={() => { setDocLoaded(false); setDocName(''); }}
            title="Upload new document"
          >
            <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={docLoaded ? "Ask anything about your document..." : "Upload a PDF first..."}
          disabled={loading || !docLoaded}
        />
        <button className="send-btn" onClick={sendMessage} disabled={loading || !docLoaded}>
          <svg viewBox="0 0 24 24" fill="white" width="15" height="15">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}