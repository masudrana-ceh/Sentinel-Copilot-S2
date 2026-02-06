"""
Advanced PDF Processor
======================
PDF text extraction using PyMuPDF with:
- Font-size based header detection
- Hyphenated line break fixup
- Markdown header injection
"""

import re
from typing import Dict, List, Tuple

import fitz  # PyMuPDF
from loguru import logger

from config import settings
from .models import ProcessingResult
from .chunker import SemanticChunker


class PDFProcessor:
    """Advanced PDF text extraction using PyMuPDF."""

    def __init__(self):
        self.chunker = SemanticChunker(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap
        )

    def _detect_pdf_headers(self, page) -> List[Tuple[str, float]]:
        """Detect headers based on font size from PDF metadata."""
        headers = []
        try:
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    for span in line["spans"]:
                        is_bold = "bold" in span.get("font", "").lower()
                        font_size = span.get("size", 12)

                        if font_size > 14 or (font_size > 12 and is_bold):
                            text = span["text"].strip()
                            if text and len(text) > 2:
                                headers.append((text, font_size))
        except Exception as e:
            logger.debug(f"Header detection failed for page: {e}")
        return headers

    def extract_text(self, pdf_content: bytes) -> Dict[int, str]:
        """Extract text from PDF with enhanced processing."""
        if not isinstance(pdf_content, bytes):
            raise TypeError(f"Expected bytes for pdf_content, got {type(pdf_content).__name__}")

        pages = {}

        try:
            with fitz.open(stream=pdf_content, filetype="pdf") as doc:
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    text = page.get_text("text", sort=True)

                    # Detect PDF-native headers and insert markdown markers
                    try:
                        pdf_headers = self._detect_pdf_headers(page)
                        for header_text, font_size in pdf_headers:
                            level = "##" if font_size > 16 else "###"
                            text = text.replace(header_text, f"\n{level} {header_text}\n", 1)
                    except Exception as e:
                        logger.debug(f"Header injection failed on page {page_num + 1}: {e}")

                    # Clean up
                    text = re.sub(r'\n{4,}', '\n\n\n', text)
                    text = re.sub(r' {3,}', '  ', text)
                    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)  # Fix hyphenated line breaks

                    if text.strip():
                        pages[page_num + 1] = text.strip()

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Failed to extract PDF text: {e}")

        return pages

    def process(self, content: bytes, filename: str) -> ProcessingResult:
        """Process PDF into enriched chunks."""
        pages = self.extract_text(content)

        all_chunks = []
        total_chars = 0
        headers_found = 0
        code_blocks = 0
        tables = 0

        for page_num, page_text in pages.items():
            total_chars += len(page_text)
            chunks = self.chunker.chunk_text(page_text, page_num, filename)

            if not chunks:
                logger.debug(f\"No chunks produced for page {page_num} of {filename}\")
                continue

            for chunk in chunks:
                if chunk.header:
                    headers_found += 1
                if chunk.chunk_type == "code":
                    code_blocks += 1
                elif chunk.chunk_type == "table":
                    tables += 1

            all_chunks.extend(chunks)

        logger.info(
            f"Processed {filename}: {len(pages)} pages, {len(all_chunks)} chunks, "
            f"{headers_found} headers, {code_blocks} code blocks, {tables} tables"
        )

        return ProcessingResult(
            page_count=len(pages),
            chunk_count=len(all_chunks),
            total_chars=total_chars,
            chunks=all_chunks,
            headers_found=headers_found,
            code_blocks_found=code_blocks,
            tables_found=tables
        )
