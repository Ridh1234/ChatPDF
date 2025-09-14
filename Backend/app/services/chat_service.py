import os
import json
import logging
import google.generativeai as genai
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class ChatService:
    """
    Service for handling chat interactions with PDF content using Gemini AI.
    """
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Configure Gemini AI
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def chat_with_pdf(self, question: str, pdf_content: str, context: Optional[List[Dict]] = None) -> Dict:
        """
        Chat with PDF content using Gemini AI.
        
        Args:
            question (str): User's question
            pdf_content (str): Extracted text from PDF
            context (Optional[List[Dict]]): Previous conversation context
            
        Returns:
            Dict: Response with answer and metadata
        """
        try:
            # Prepare the prompt
            prompt = self._build_prompt(question, pdf_content, context)
            
            # Generate response using Gemini
            response = self.model.generate_content(prompt)
            
            return {
                "success": True,
                "answer": response.text,
                "question": question,
                "confidence": "high",  # Gemini doesn't provide confidence scores
                "source": "gemini-1.5-flash"
            }
            
        except Exception as e:
            logger.error(f"Error in chat_with_pdf: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "question": question,
                "answer": "I apologize, but I encountered an error while processing your question. Please try again."
            }
    
    def _build_prompt(self, question: str, pdf_content: str, context: Optional[List[Dict]] = None) -> str:
        """
        Build a comprehensive prompt for Gemini AI.
        
        Args:
            question (str): User's question
            pdf_content (str): PDF content
            context (Optional[List[Dict]]): Previous conversation context
            
        Returns:
            str: Formatted prompt
        """
        prompt_parts = []
        
        # System instruction
        prompt_parts.append("""You are Inferra.ai, an AI assistant specialized in analyzing and answering questions about PDF documents. You help users understand, extract insights, and get specific information from their uploaded documents.

Key guidelines:
1. Always base your answers on the provided PDF content
2. If information isn't available in the document, clearly state this
3. Provide specific page references when possible
4. Give detailed, helpful answers while being concise
5. If the question is ambiguous, ask for clarification
6. Maintain a professional, friendly tone
7. Format responses clearly with bullet points or numbered lists when appropriate""")
        
        # Add conversation context if available
        if context and len(context) > 0:
            prompt_parts.append("\nPrevious conversation context:")
            for msg in context[-5:]:  # Last 5 messages for context
                if msg.get("question"):
                    prompt_parts.append(f"Q: {msg['question']}")
                if msg.get("answer"):
                    prompt_parts.append(f"A: {msg['answer']}")
        
        # Add PDF content
        prompt_parts.append(f"\nDocument Content:\n{pdf_content[:8000]}")  # Limit content length
        
        # Add current question
        prompt_parts.append(f"\nUser Question: {question}")
        
        # Final instruction
        prompt_parts.append("\nPlease provide a comprehensive answer based on the document content:")
        
        return "\n".join(prompt_parts)
    
    def get_document_summary(self, pdf_content: str) -> Dict:
        """
        Generate a summary of the PDF document.
        
        Args:
            pdf_content (str): Extracted text from PDF
            
        Returns:
            Dict: Summary with key insights
        """
        try:
            prompt = f"""Please provide a comprehensive summary of this document. Include:

1. Main topic/subject matter
2. Key points and findings
3. Document structure/sections
4. Important data or statistics (if any)
5. Conclusions or recommendations (if any)

Document Content:
{pdf_content[:6000]}

Please format the summary clearly with headings and bullet points."""

            response = self.model.generate_content(prompt)
            
            return {
                "success": True,
                "summary": response.text,
                "source": "gemini-1.5-flash"
            }
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "summary": "Unable to generate summary at this time."
            }
    
    def extract_key_insights(self, pdf_content: str) -> Dict:
        """
        Extract key insights and topics from the PDF.
        
        Args:
            pdf_content (str): Extracted text from PDF
            
        Returns:
            Dict: Key insights and topics
        """
        try:
            prompt = f"""Analyze this document and extract:

1. 5-10 key topics/themes
2. Important facts or data points
3. Action items or recommendations (if any)
4. Key entities mentioned (people, organizations, dates, etc.)
5. Main conclusions

Please format as a structured list.

Document Content:
{pdf_content[:6000]}"""

            response = self.model.generate_content(prompt)
            
            return {
                "success": True,
                "insights": response.text,
                "source": "gemini-1.5-flash"
            }
            
        except Exception as e:
            logger.error(f"Error extracting insights: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "insights": "Unable to extract insights at this time."
            }
