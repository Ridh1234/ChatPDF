from typing import List, Optional
from huggingface_hub import InferenceClient
from .config import settings, HF_TOKEN
import logging

# Configure logging
logger = logging.getLogger(__name__)

try:
	from sentence_transformers import SentenceTransformer
	_HAS_ST = True
except Exception:
	_HAS_ST = False

class EmbeddingClient:
	"""Client for generating text embeddings using local SentenceTransformer or Hugging Face Inference API."""
	
	def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
		self.api_key = api_key or HF_TOKEN
		self.model = model or settings.HUGGINGFACE_MODEL
		self.provider = settings.EMBEDDING_PROVIDER
		self.batch_size = settings.EMBEDDING_BATCH_SIZE
		
		self.client: Optional[InferenceClient] = None
		self.local_model: Optional[SentenceTransformer] = None
		
		if self.provider == "local":
			if not _HAS_ST:
				raise RuntimeError("sentence-transformers is not installed but EMBEDDING_PROVIDER=local")
			logger.info(f"Loading local SentenceTransformer model: {self.model}")
			self.local_model = SentenceTransformer(self.model)
		else:
			if not self.api_key:
				raise ValueError("Hugging Face API token is required for EMBEDDING_PROVIDER=hf")
			try:
				self.client = InferenceClient(
					model=self.model,
					token=self.api_key,
				)
				logger.info(f"Initialized HF Inference client with model: {self.model}")
			except Exception as e:
				logger.error(f"Failed to initialize Hugging Face client: {e}")
				raise
	
	def get_embeddings(self, texts: List[str]) -> List[List[float]]:
		if not texts:
			return []
		if self.provider == "local":
			return self._get_local_embeddings(texts)
		return self._get_remote_embeddings(texts)
	
	def _get_local_embeddings(self, texts: List[str]) -> List[List[float]]:
		logger.info(f"Generating embeddings locally for {len(texts)} texts (batch_size={self.batch_size})")
		embeddings: List[List[float]] = []
		# Encode in batches to control memory and speed
		for i in range(0, len(texts), self.batch_size):
			batch = texts[i:i + self.batch_size]
			vecs = self.local_model.encode(batch, batch_size=self.batch_size, show_progress_bar=False, normalize_embeddings=True)
			# Ensure lists of floats
			if hasattr(vecs, 'tolist'):
				vecs = vecs.tolist()
			embeddings.extend(vecs)
		return embeddings
	
	def _get_remote_embeddings(self, texts: List[str]) -> List[List[float]]:
		"""Generate embeddings using remote Hugging Face API (serial)."""
		embeddings: List[List[float]] = []
		for txt in texts:
			try:
				result = self.client.feature_extraction(txt)
				if hasattr(result, 'tolist'):
					result = result.tolist()
				if isinstance(result, list) and all(isinstance(x, (int, float)) for x in result):
					embeddings.append(result)
				else:
					logger.warning(f"Unexpected embedding format: {type(result)}")
					embeddings.append([])
			except Exception as e:
				logger.error(f"Error generating remote embedding: {str(e)}")
				embeddings.append([])
		return embeddings

# Default client instance
client = EmbeddingClient()

def get_embeddings(texts: List[str], model: Optional[str] = None) -> List[List[float]]:
	if model and model != client.model:
		client.model = model
	return client.get_embeddings(texts)
