from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.embedding import get_embeddings
from app.store_chromadb import ChromaDBStore
from app.config import settings, HF_TOKEN
import os
import logging
from openai import OpenAI
from typing import Optional

router = APIRouter()

class ChatRequest(BaseModel):
	query: str
	document_id: Optional[str] = None

class ChatResponse(BaseModel):
	answer: str
	document_id: Optional[str] = None
	chunks_retrieved: int = 0

# Setup ChromaDB client (default settings)
chroma_store = ChromaDBStore()

# Setup OpenAI-compatible client for Hugging Face router
openai_client = OpenAI(
	base_url="https://router.huggingface.co/v1",
	api_key=HF_TOKEN,
)

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
	query = request.query.strip()
	document_id = request.document_id
	if not query:
		raise HTTPException(status_code=400, detail="Query cannot be empty.")

	# Step 1: Get query embedding
	try:
		embedding = get_embeddings([query])[0]
	except Exception as e:
		logging.exception("Failed to generate embedding for query.")
		raise HTTPException(status_code=500, detail="Embedding generation failed.")

	# Step 2: Retrieve context
	try:
		if document_id:
			# Full-document mode: fetch ALL chunks in order; no size cap
			all_doc = chroma_store.get_by_document(document_id)
			chunks = all_doc.get("documents", [])
			metadatas = all_doc.get("metadatas", [])
			logging.info(f"Full-document retrieval: {len(chunks)} chunks for document {document_id}")
			retrieved_chunks = "\n---\n".join(chunks) if chunks else ""
			if not retrieved_chunks:
				return ChatResponse(
					answer="I couldn't find any text for this document. It may not be processed yet.",
					document_id=document_id,
					chunks_retrieved=0
				)
		else:
			# Cross-document RAG: use vector search with top_k
			where_filter = None
			rag_results = chroma_store.query(
				query_embedding=embedding,
				n_results=settings.RAG_TOP_K,
				where=where_filter
			)
			documents_lists = rag_results.get("documents", [[]])
			chunks = documents_lists[0] if documents_lists else []
			retrieved_chunks = "\n---\n".join(chunks) if chunks else ""
			if not retrieved_chunks:
				return ChatResponse(
					answer="I couldn't find any relevant information in the available documents. Please upload documents or rephrase your query.",
					chunks_retrieved=0
				)
	except Exception:
		logging.exception("Failed to retrieve context from ChromaDB.")
		raise HTTPException(status_code=500, detail="ChromaDB retrieval failed.")

	# Step 3: Construct system prompt
	context_info = f"Context from document: {document_id}" if document_id else "Context from available documents"
	system_prompt = (
		"You are Zerra.ai, a friendly and helpful AI assistant for business users. "
		"You are capable of answering general questions, engaging in natural conversation, and providing helpful, concise, and professional responses. "
		"If the user simply greets you (e.g., 'hi', 'hello'), respond naturally and conversationally, just like ChatGPT. "
		"If the user asks a question that does not require document context, answer it as best as you can. "
		"If the user asks about uploaded documents, use the provided context below to answer with as much detail as possible. "
		"If the context is insufficient to answer a document-specific question, say: 'I don't know based on the documents provided.' "
		"Never insist on uploading a document unless the user specifically asks about document analysis or uploads. "
		f"\n\n{context_info}:\n{retrieved_chunks}"
		f"\n\nUser: {query}\nAssistant:"
	)

	# Step 4: Call DeepSeek LLM via Hugging Face router (OpenAI API)
	try:
		completion = openai_client.chat.completions.create(
			model="deepseek-ai/DeepSeek-Prover-V2-671B:novita",
			messages=[{"role": "user", "content": system_prompt}],
		)
		answer = completion.choices[0].message.content
	except Exception:
		logging.exception("Failed to generate answer from LLM.")
		raise HTTPException(status_code=500, detail="LLM generation failed.")

	return ChatResponse(
		answer=answer,
		document_id=document_id,
		chunks_retrieved=len(chunks)
	)
