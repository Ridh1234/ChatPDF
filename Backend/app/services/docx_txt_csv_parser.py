import csv
from pathlib import Path
from typing import List

class DocxTxtCsvParser:
    @staticmethod
    def parse_docx(file_path: str) -> str:
        import docx
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return '\n'.join(full_text)

    @staticmethod
    def parse_txt(file_path: str) -> str:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()

    @staticmethod
    def parse_csv(file_path: str) -> str:
        # Flatten CSV into a string, each row as comma-separated, each row newline
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            lines = [', '.join(row) for row in reader]
        return '\n'.join(lines)
