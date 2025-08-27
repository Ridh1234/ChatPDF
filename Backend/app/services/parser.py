import os
import json
import fitz  # PyMuPDF
import pdfplumber
import camelot
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTChar

class PDFStructuredParser:
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.figures_dir = os.path.join(os.path.dirname(__file__), '../../data/outputs/figures')
        self.structured_dir = os.path.join(os.path.dirname(__file__), '../../data/outputs/structured')
        os.makedirs(self.figures_dir, exist_ok=True)
        os.makedirs(self.structured_dir, exist_ok=True)

    def extract_pages(self) -> list:
        with pdfplumber.open(self.filepath) as pdf:
            return [page for page in pdf.pages]

    def extract_tables(self, page) -> list:
        tables = []
        try:
            camelot_tables = camelot.read_pdf(self.filepath, pages=str(page.page_number), flavor='stream')
            for table in camelot_tables:
                tables.append(table.data)
        except Exception:
            pass
        if not tables:
            for t in page.extract_tables():
                tables.append(t)
        return tables

    def extract_figures(self, page) -> list:
        figures = []
        doc = fitz.open(self.filepath)
        for img_index, img in enumerate(doc[page.page_number-1].get_images(full=True)):
            xref = img[0]
            pix = fitz.Pixmap(doc, xref)
            if pix.n < 5:
                img_filename = f"page{page.page_number}_fig{img_index+1}.png"
                img_path = os.path.join(self.figures_dir, img_filename)
                pix.save(img_path)
                figures.append(img_filename)
            pix = None
        doc.close()
        return figures

    def extract_headings(self, page) -> list:
        headings = []
        for pdfminer_page in extract_pages(self.filepath, page_numbers=[page.page_number-1]):
            for element in pdfminer_page:
                if isinstance(element, LTTextContainer):
                    for text_line in element:
                        font_sizes = [char.size for char in text_line if isinstance(char, LTChar)]
                        bolds = [char.fontname for char in text_line if isinstance(char, LTChar) and 'Bold' in char.fontname]
                        if font_sizes and (max(font_sizes) > 12 or bolds):
                            text = text_line.get_text().strip()
                            if text:
                                headings.append(text)
        return headings

    def extract_paragraphs(self, page) -> list:
        text = page.extract_text() or ""
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        return paragraphs

    def parse(self) -> dict:
        pages = self.extract_pages()
        output = {"pages": []}
        for page in pages:
            elements = []
            headings = self.extract_headings(page)
            for h in headings:
                elements.append({"type": "heading", "content": h})
            tables = self.extract_tables(page)
            for t in tables:
                elements.append({"type": "table", "data": t})
            figures = self.extract_figures(page)
            for f in figures:
                elements.append({"type": "figure", "filename": f})
            paragraphs = self.extract_paragraphs(page)
            for p in paragraphs:
                elements.append({"type": "paragraph", "content": p})
            output["pages"].append({"page_num": page.page_number, "elements": elements})
        # Save JSON
        basename = os.path.splitext(os.path.basename(self.filepath))[0]
        out_path = os.path.join(self.structured_dir, f"{basename}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        return output
