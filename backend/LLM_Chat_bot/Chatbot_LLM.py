# -*- coding: utf-8 -*-
"""
GCMS Legal Chatbot Backend - Type-Safe Version
"""

# Standard Library Imports
import os
import logging
import shutil
import asyncio
from typing import List, Optional, AsyncGenerator
from pathlib import Path

# Third-Party Imports
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, SecretStr
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langdetect import detect, LangDetectException
from deep_translator import GoogleTranslator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

# Load and validate environment variables
load_dotenv()

def get_env_var(name: str) -> str:
    """Get required environment variable with type safety"""
    value = os.getenv(name)
    if not value:
        raise ValueError(f"❌ Missing required environment variable: {name}")
    return value

api_key = get_env_var("GROQ_API_KEY")
api_key2 = get_env_var("GROQ_API_KEY2")
hf_token = get_env_var("HF_TOKEN")

os.environ["HF_TOKEN"] = hf_token  # For Hugging Face authentication

# Initialize Language Models with type-safe configuration
llm_main = ChatGroq(
    api_key=SecretStr(api_key),  # type: ignore
    model="gemma2-9b-it",
    temperature=0.3
)

llm_backup = ChatGroq(
    api_key=SecretStr(api_key2),  # type: ignore
    model="llama-3.1-8b-instant",
    temperature=0.5
)

embedding = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={'device': 'cpu'}
)

# Configuration Constants
LAWS_DIR = "./Laws"
CHROMA_DB = "./chroma_db"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 100

def get_file_names(directory: str) -> List[str]:
    """Get valid PDF filenames from directory"""
    return [
        f for f in os.listdir(directory) 
        if f.endswith('.pdf') and not f.startswith('.')
    ]

def process_documents(directory: str) -> Optional[Chroma]:
    """Process documents into ChromaDB with type-safe operations"""
    try:
        if not os.path.exists(directory):
            raise FileNotFoundError(f"Law directory missing: {directory}")
            
        current_files = set(get_file_names(directory))
        processed_files_path = os.path.join(CHROMA_DB, "processed_files.txt")

        if os.path.exists(CHROMA_DB) and os.listdir(CHROMA_DB):
            if os.path.exists(processed_files_path):
                with open(processed_files_path, 'r', encoding='utf-8') as f:
                    processed_files = set(f.read().splitlines())
                if current_files == processed_files:
                    logging.info("✅ Using existing ChromaDB")
                    return Chroma(
                        persist_directory=CHROMA_DB,
                        embedding_function=embedding
                    )

            shutil.rmtree(CHROMA_DB)

        logging.info("🔨 Processing legal documents...")
        docs = []
        for pdf_file in Path(directory).glob("*.pdf"):
            loader = PyPDFLoader(str(pdf_file))
            docs.extend(loader.load())

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", "。", " ", ""]
        )
        chunks = splitter.split_documents(docs)

        db = Chroma.from_documents(
            documents=chunks,
            embedding=embedding,
            persist_directory=CHROMA_DB
        )
        
        with open(processed_files_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(current_files))
            
        return db

    except Exception as e:
        logging.error(f"🚨 Document Processing Error: {str(e)}")
        return None

# Legal Prompt Template
LEGAL_PROMPT = PromptTemplate(
    input_variables=["context", "input"],
    template="""You are an expert Egyptian legal AI assistant. Provide:
    1. Precise answers based on context
    2. Relevant law citations
    3. Practical next steps
    4. Official government contacts when applicable

    Context: {context}
    Question: {input}
    Answer in the user's language:"""
)

# Initialize Retrieval System
retrieval_chain = None
try:
    law_db = process_documents(LAWS_DIR)
    if law_db:
        retriever = law_db.as_retriever(search_kwargs={"k": 5})
        doc_chain = create_stuff_documents_chain(llm_main, LEGAL_PROMPT)
        retrieval_chain = create_retrieval_chain(retriever, doc_chain)
        logging.info("✅ Legal AI System Ready")
    else:
        logging.warning("⚠️ Operating without legal database")
except Exception as e:
    logging.error(f"🚨 Retrieval System Init Failed: {str(e)}")

# FastAPI Setup
app = FastAPI(title="GCMS Legal Assistant API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class QueryRequest(BaseModel):
    question: str

async def stream_response(answer: str) -> AsyncGenerator[str, None]:
    """Type-safe streaming response generator"""
    try:
        words = answer.split()
        if words:
            yield f"Answer: {words[0]}\n\n"
            
            for word in words[1:]:
                await asyncio.sleep(0.12)
                yield f"{word}\n\n"
                
        yield "data: [END]\n\n"
    except Exception as e:
        logging.error(f"🚨 Streaming Error: {str(e)}")
        yield "data: [SYSTEM ERROR]\n\n"

def safe_translate(text: str, target_lang: str) -> str:
    """Type-safe translation with fallback"""
    try:
        return GoogleTranslator(
            source='auto',
            target=target_lang
        ).translate(text[:5000])
    except Exception as e:
        logging.error(f"🚨 Translation Failed: {str(e)}")
        return text

@app.post("/query")
async def legal_query(request: QueryRequest) -> StreamingResponse:
    """Main query endpoint with type-safe operations"""
    try:
        # Language detection
        try:
            user_lang = detect(request.question)
        except LangDetectException:
            user_lang = "en"

        # Context retrieval
        # Context retrieval
        combined_context = ""
        if retrieval_chain and retriever:
            try:
                # Use invoke() instead of get_relevant_documents()
                retrieved_docs = retriever.invoke(request.question)
                combined_context = "\n\n".join(
                    [doc.page_content for doc in retrieved_docs]
                )
            except Exception as e:
                logging.error(f"🚨 Context Retrieval Error: {str(e)}")
        # Response generation
        answer = ""
        if combined_context:
            try:
                response = llm_main.invoke(
                    LEGAL_PROMPT.format(
                        context=combined_context,
                        input=request.question
                    )
                )
                answer = response.content if hasattr(response, 'content') else str(response)
            except Exception as e:
                logging.error(f"🚨 Main LLM Error: {str(e)}")
                answer = "Legal system unavailable."
        else:
            try:
                backup_resp = llm_backup.invoke(request.question)
                answer = backup_resp.content if hasattr(backup_resp, 'content') else str(backup_resp)
                answer = f"General Information: {answer}"
            except Exception as e:
                logging.error(f"🚨 Backup LLM Error: {str(e)}")
                answer = "System busy."

        # Post-processing
        if isinstance(answer, str):
            clean_answer = answer.replace("\n", " ").strip()
        else:
            clean_answer = str(answer).replace("\n", " ").strip()

        if user_lang == "ar":
            clean_answer = safe_translate(clean_answer, "ar")

        return StreamingResponse(
            stream_response(clean_answer),
            media_type="text/event-stream"
        )

    except Exception as e:
        logging.error(f"🚨 Critical Query Error: {str(e)}")
        return StreamingResponse(
            iter(["data: System maintenance in progress.\n\ndata: [END]\n\n"]),
            media_type="text/event-stream"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        timeout_keep_alive=300
    )
