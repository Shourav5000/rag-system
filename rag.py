import os
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

llm = ChatAnthropic(
    model="claude-sonnet-4-6",
    anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY"),
    max_tokens=1024
)

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

def load_document(pdf_path):
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks")
    return chunks

def build_vectorstore(chunks):
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )
    print("Vector store ready!")
    return vectorstore

def build_rag_chain(vectorstore):
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
    return chain, retriever

if __name__ == "__main__":
    import sys

    pdf_path = input("Enter PDF path: ").strip().strip('"')
    if not os.path.exists(pdf_path):
        print("File not found!")
        sys.exit(1)

    print("Loading document...")
    chunks = load_document(pdf_path)

    print("Building vector store...")
    vectorstore = build_vectorstore(chunks)

    print("Building RAG chain...")
    chain, retriever = build_rag_chain(vectorstore)

    print("\nRAG System Ready! Type 'quit' to exit\n")

    while True:
        question = input("Ask a question: ").strip()
        if question.lower() == "quit":
            break

        answer = chain.invoke(question)
        docs = retriever.invoke(question)
        print(f"\nAnswer: {answer}")
        print(f"Sources: {len(docs)} chunks used\n")