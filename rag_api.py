import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
import tempfile

load_dotenv()

app = Flask(__name__)
CORS(app)

llm = ChatAnthropic(
    model="claude-sonnet-4-6",
    anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY"),
    max_tokens=1024
)

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

vectorstore = None
chain = None
retriever = None

def build_rag(pdf_path):
    global vectorstore, chain, retriever

    loader = PyPDFLoader(pdf_path)
    documents = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=200
    )
    chunks = splitter.split_documents(documents)

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    prompt = PromptTemplate.from_template("""You are a helpful assistant.
Use the following context to answer the question accurately and concisely.
If you don't know the answer from the context, say so clearly.

Context: {context}

Question: {question}

Answer:""")

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    return len(chunks)

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename.endswith(".pdf"):
        return jsonify({"error": "Only PDF files allowed"}), 400

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        file.save(tmp.name)
        chunks = build_rag(tmp.name)

    return jsonify({
        "message": f"Document loaded successfully!",
        "chunks": chunks,
        "filename": file.filename
    })

@app.route("/ask", methods=["POST"])
def ask():
    if chain is None:
        return jsonify({"error": "Please upload a PDF first"}), 400

    data = request.json
    question = data.get("question", "")
    if not question:
        return jsonify({"error": "No question provided"}), 400

    answer = chain.invoke(question)
    docs = retriever.invoke(question)

    sources = [
        {"page": doc.metadata.get("page", 0) + 1,
         "preview": doc.page_content[:150] + "..."}
        for doc in docs
    ]

    return jsonify({"answer": answer, "sources": sources})

if __name__ == "__main__":
    print("RAG API running on http://localhost:5001")
    app.run(port=5001, debug=True)