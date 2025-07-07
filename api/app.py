# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import tempfile
from typing import Optional, List
from dotenv import load_dotenv
from datetime import datetime
import numpy as np

import sys
sys.path.append('../')
from aimakerspace.text_utils import CharacterTextSplitter
from aimakerspace.vectordatabase import VectorDatabase

load_dotenv(dotenv_path="../.env.local")

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API with Multi-File RAG")

# Supported file types
SUPPORTED_EXTENSIONS = {
    '.pdf': 'PDF Document',
    '.txt': 'Text File',
    '.py': 'Python Code',
    '.js': 'JavaScript Code',
    '.ts': 'TypeScript Code',
    '.tsx': 'TypeScript React',
    '.jsx': 'JavaScript React',
    '.md': 'Markdown Document',
    '.json': 'JSON Data',
    '.csv': 'CSV Data',
    '.html': 'HTML Document',
    '.css': 'CSS Stylesheet',
    '.yml': 'YAML Configuration',
    '.yaml': 'YAML Configuration'
}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UniversalFileLoader:
    """Universal file loader that can handle multiple file types"""
    def __init__(self, file_path: str, filename: str):
        self.documents = []
        self.file_path = file_path
        self.filename = filename
        self.file_ext = os.path.splitext(filename)[1].lower()
    
    def load(self):
        """Load file based on its extension"""
        try:
            if self.file_ext == '.pdf':
                return self._load_pdf()
            else:
                return self._load_text_file()
        except Exception as e:
            raise ValueError(f"Error loading file {self.filename}: {str(e)}")
    
    def _load_pdf(self):
        """Load PDF file"""
        import PyPDF2
        with open(self.file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            self.documents.append(text)
        return self.documents
    
    def _load_text_file(self):
        """Load text-based files"""
        encodings = ['utf-8', 'latin-1', 'ascii']
        
        for encoding in encodings:
            try:
                with open(self.file_path, 'r', encoding=encoding) as file:
                    content = file.read()
                    self.documents.append(content)
                    return self.documents
            except UnicodeDecodeError:
                continue
        
        raise ValueError(f"Could not decode file {self.filename} with any supported encoding")

# Data models
class ProcessedChunk(BaseModel):
    text: str
    filename: str

class FileInfo(BaseModel):
    filename: str
    file_type: str
    uploaded_at: str
    chunks_count: int
    file_size: int
    processed_chunks: List[ProcessedChunk]

class ChatRequest(BaseModel):
    developer_message: str
    user_message: str
    model: Optional[str] = "gpt-4.1-mini"
    # Frontend passes all processed file data
    uploaded_files: Optional[List[FileInfo]] = []

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(chat_request: ChatRequest):
    try:
        user_message_lower = chat_request.user_message.lower()
        
        # Check for command prefix - only process commands that start with "cmd:"
        if user_message_lower.startswith("cmd:"):
            # Extract command after "cmd:"
            command = user_message_lower[4:].strip()
            
            # Help command - show available commands
            if command == "help":
                help_message = """Available commands:

• cmd:help - Show this help message
• cmd:upload - Upload a file for indexing
• cmd:files - List currently uploaded files
• cmd:supported - Show supported file types
• cmd:delete <filename> - Delete a specific file

Examples:
• cmd:upload
• cmd:files
• cmd:delete report.pdf
• cmd:supported

For regular conversation, just type your message without the cmd: prefix."""
                
                return {
                    "type": "help",
                    "message": help_message,
                    "streaming": False
                }
            
            # Upload command
            elif command == "upload":
                return {
                    "type": "upload_request", 
                    "message": "Please select a file to upload and index.",
                    "streaming": False
                }
            
            # Show supported files command
            elif command == "supported":
                supported_list = []
                for ext, description in SUPPORTED_EXTENSIONS.items():
                    supported_list.append(f"• {ext} - {description}")
                
                message = f"Supported file types ({len(SUPPORTED_EXTENSIONS)}):\n\n" + "\n".join(supported_list)
                message += "\n\nTo upload a file, type: cmd:upload"
                
                return {
                    "type": "supported_files",
                    "message": message,
                    "streaming": False
                }
            
            # Show current files command
            elif command == "files":
                if not chat_request.uploaded_files:
                    message = "No files currently uploaded."
                else:
                    file_list = []
                    for file_info in chat_request.uploaded_files:
                        file_list.append(f"• {file_info.filename} ({file_info.file_type}) - Uploaded: {file_info.uploaded_at}")
                    
                    message = f"Currently uploaded files ({len(chat_request.uploaded_files)}):\n\n" + "\n".join(file_list)
                
                return {
                    "type": "file_list",
                    "message": message,
                    "streaming": False
                }
            
            # Delete file command  
            elif command.startswith("delete "):
                filename_to_delete = command[7:].strip()  # Remove "delete " prefix
                
                if not filename_to_delete:
                    if chat_request.uploaded_files:
                        available_files = [file_info.filename for file_info in chat_request.uploaded_files]
                        return {
                            "type": "error", 
                            "message": f"Please specify a filename to delete. Available files: {', '.join(available_files)}",
                            "streaming": False
                        }
                    else:
                        return {
                            "type": "error", 
                            "message": "No files available to delete.",
                            "streaming": False
                        }
                
                # Look for exact filename match (case-insensitive)
                file_to_remove = None
                for file_info in chat_request.uploaded_files:
                    if filename_to_delete.lower() == file_info.filename.lower():
                        file_to_remove = file_info
                        break
                
                if file_to_remove:
                    # Return the updated file list (frontend will handle the removal)
                    updated_files = [f for f in chat_request.uploaded_files if f.filename != file_to_remove.filename]
                    
                    return {
                        "type": "file_deleted",
                        "message": f"File '{file_to_remove.filename}' deleted successfully. {len(updated_files)} files remaining.",
                        "updated_files": [f.dict() for f in updated_files],
                        "streaming": False
                    }
                else:
                    if chat_request.uploaded_files:
                        available_files = [file_info.filename for file_info in chat_request.uploaded_files]
                        return {
                            "type": "error",
                            "message": f"File '{filename_to_delete}' not found. Available files: {', '.join(available_files)}",
                            "streaming": False
                        }
                    else:
                        return {
                            "type": "error",
                            "message": "No files available to delete.",
                            "streaming": False
                        }
            
            # Unknown command
            else:
                return {
                    "type": "error",
                    "message": f"Unknown command: {command}\n\nType 'cmd:help' to see available commands.",
                    "streaming": False
                }
        
        # Initialize OpenAI client
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # If we have uploaded files, rebuild vector database and use RAG
        if chat_request.uploaded_files:
            try:
                # Rebuild vector database from processed chunks
                vector_db = VectorDatabase()
                
                # Collect all chunks from all files
                all_chunks = []
                for file_info in chat_request.uploaded_files:
                    for chunk in file_info.processed_chunks:
                        all_chunks.append(f"[{chunk.filename}] {chunk.text}")
                
                if all_chunks:
                    # Build vector database from chunks
                    vector_db = await vector_db.abuild_from_list(all_chunks)
                    
                    # RAG-enhanced chat
                    async def generate_rag():
                        # Get relevant context from vector database
                        relevant_chunks = vector_db.search_by_text(
                            chat_request.user_message, 
                            k=3, 
                            return_as_text=True
                        )
                        
                        # Create context from relevant chunks
                        context = "\n\n".join(relevant_chunks) if relevant_chunks else ""
                        
                        # Create file context information
                        file_context = f"Currently loaded files: {[file_info.filename for file_info in chat_request.uploaded_files]}"
                        
                        # Enhance the developer message with file context
                        enhanced_developer_message = f"""{chat_request.developer_message}

You have access to content from uploaded files. Use this content to answer the user's question:

{file_context}

DOCUMENT CONTENT:
{context}

Please answer the user's question based on the document content above. If the question cannot be answered from the documents, say so clearly."""

                        # Create streaming response with RAG context
                        stream = client.chat.completions.create(
                            model=chat_request.model,
                            messages=[
                                {"role": "developer", "content": enhanced_developer_message},
                                {"role": "user", "content": chat_request.user_message}
                            ],
                            stream=True
                        )
                        
                        for chunk in stream:
                            if chunk.choices[0].delta.content is not None:
                                yield chunk.choices[0].delta.content

                    return StreamingResponse(generate_rag(), media_type="text/plain")
            
            except Exception as e:
                # If RAG fails, fall back to regular chat but inform user
                error_message = f"""⚠️  RAG PROCESSING ERROR

Failed to process uploaded files for search: {str(e)}

Falling back to regular chat without file context."""
                
                return {
                    "type": "error",
                    "message": error_message,
                    "streaming": False
                }
        
        # Regular chat without RAG
        async def generate():
            stream = client.chat.completions.create(
                model=chat_request.model,
                messages=[
                    {"role": "developer", "content": chat_request.developer_message},
                    {"role": "user", "content": chat_request.user_message}
                ],
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Define the file upload and indexing endpoint
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided.")
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in SUPPORTED_EXTENSIONS:
            supported_exts = ', '.join(SUPPORTED_EXTENSIONS.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type '{file_ext}'. Supported types: {supported_exts}"
            )
        
        # Read the uploaded file
        file_content = await file.read()
        
        # Save to temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Load and process the file using UniversalFileLoader
            file_loader = UniversalFileLoader(temp_file_path, file.filename)
            documents = file_loader.load()
            
            if not documents:
                raise HTTPException(status_code=400, detail="Could not extract text from file.")
            
            # Split text into chunks
            text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = text_splitter.split_texts(documents)
            
            if not chunks:
                raise HTTPException(status_code=400, detail="No text chunks created from file.")
            
            # Create processed chunks
            processed_chunks = []
            for chunk in chunks:
                processed_chunks.append(ProcessedChunk(
                    text=chunk,
                    filename=file.filename
                ))
            
            # Create file info with all processed data
            file_info = FileInfo(
                filename=file.filename,
                file_type=SUPPORTED_EXTENSIONS[file_ext],
                uploaded_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                chunks_count=len(chunks),
                file_size=len(file_content),
                processed_chunks=processed_chunks
            )
            
            return {
                "success": True,
                "message": f"File '{file.filename}' ({SUPPORTED_EXTENSIONS[file_ext]}) uploaded and indexed successfully! You can now ask questions about it.",
                "file_info": file_info.dict(),
                "chunks_created": len(chunks)
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
