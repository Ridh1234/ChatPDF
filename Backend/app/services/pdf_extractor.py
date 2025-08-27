import fitz  # PyMuPDF
import pdfplumber
from pathlib import Path

# OCR dependencies
import pytesseract
from PIL import Image
import cv2
import numpy as np


class PDFExtractor:
    """
    Optimized PDF parsing helper.

    Features:
    1. Fast, page-by-page text extraction with PyMuPDF.
    2. Optional table extraction via pdfplumber.
    3. OCR fallback ONLY if page has no selectable text.
    4. Memory efficient – processes page by page.
    """

    ###############################
    # PUBLIC METHODS              #
    ###############################

    @staticmethod
    def extract_text(file_path: str, dpi: int = 300, extract_tables: bool = False) -> str:
        """Return concatenated text of all pages."""
        return PDFExtractor.extract_content(file_path, dpi=dpi, extract_tables=extract_tables)["text"]

    @staticmethod
    def extract_content(file_path: str, dpi: int = 300, extract_tables: bool = False) -> dict:
        """
        Extract text and (optionally) tables from every page of a PDF.

        Returns:
            {
              "text": "<all pages concatenated>",
              "pages": [
                 {
                   "page": 1,
                   "text": "...",
                   "tables": [ [[row1],[row2], ...], ... ]  # only if extract_tables=True
                 },
                 ...
              ]
            }
        """
        doc = fitz.open(file_path)
        plumber_pdf = pdfplumber.open(file_path) if extract_tables else None

        all_pages_output: list[dict] = []
        aggregated_text_parts: list[str] = []

        try:
            for page_index in range(len(doc)):
                page_dict: dict = {"page": page_index + 1}

                # --- TEXT EXTRACTION (fast path) ---
                text: str = doc[page_index].get_text("text") or ""

                # --- OCR fallback if no text ---
                if not text.strip():
                    text = PDFExtractor._ocr_single_page(doc, page_index, dpi)

                text = text.strip()
                page_dict["text"] = text
                if text:
                    aggregated_text_parts.append(text)

                # --- TABLE EXTRACTION (optional) ---
                if extract_tables:
                    try:
                        raw_tables = plumber_pdf.pages[page_index].extract_tables() or []
                    except Exception:
                        raw_tables = []
                    page_dict["tables"] = raw_tables

                all_pages_output.append(page_dict)

        finally:
            if plumber_pdf:
                plumber_pdf.close()
            doc.close()

        return {"text": "\n".join(aggregated_text_parts), "pages": all_pages_output}

    ###############################
    # INTERNAL HELPERS             #
    ###############################

    @staticmethod
    def _ocr_single_page(doc: fitz.Document, page_index: int, dpi: int) -> str:
        """OCR a single page and return recognised text."""
        page = doc[page_index]
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pil_img = PDFExtractor._pixmap_to_pil(pix)
        return pytesseract.image_to_string(pil_img, lang="eng")

    @staticmethod
    def _pixmap_to_pil(pix: fitz.Pixmap) -> Image.Image:
        """Convert PyMuPDF Pixmap to PIL Image using PNG buffer."""
        img_data = pix.tobytes("png")  # get PNG encoded bytes
        np_arr = np.frombuffer(img_data, dtype=np.uint8)
        cv_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)  # decode to BGR
        cv_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        return Image.fromarray(cv_img)
