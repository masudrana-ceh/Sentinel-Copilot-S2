"""
BM25 Keyword Index (Okapi BM25)
================================
Sparse keyword-based retrieval complementary to vector search.
Catches exact term matches that embedding models sometimes miss.

Parameters tuned for academic/technical documents:
- k1=1.5 (term frequency saturation)
- b=0.75 (document length normalization)
"""

import re
import math
from collections import Counter, defaultdict
from typing import Dict, List, Tuple


class BM25Index:
    """Okapi BM25 ranking function for keyword-based retrieval."""

    STOP_WORDS = frozenset([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
        'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
        'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
        'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
        'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
        'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
        'about', 'into', 'over', 'after', 'below', 'between', 'under',
        'again', 'then', 'once', 'during', 'while', 'before', 'above',
        'being', 'through', 'further', 'because', 'until',
    ])

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.doc_count = 0
        self.avgdl = 0.0
        self.doc_lengths: Dict[str, int] = {}
        self.doc_freqs: Dict[str, int] = defaultdict(int)
        self.inverted_index: Dict[str, Dict[str, int]] = defaultdict(dict)
        self.doc_texts: Dict[str, str] = {}
        self.doc_metadata: Dict[str, Dict] = {}

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize with normalization."""
        tokens = re.findall(r'\b[a-zA-Z0-9][\w\-\.]*[a-zA-Z0-9]\b|\b\w\b', text.lower())
        return [t for t in tokens if t not in self.STOP_WORDS and len(t) > 1]

    def add_document(self, doc_id: str, text: str, metadata: Dict = None):
        """Add a document to the BM25 index."""
        if not isinstance(text, str) or not text.strip():
            return
        if not isinstance(doc_id, str) or not doc_id.strip():
            return

        tokens = self._tokenize(text)
        self.doc_texts[doc_id] = text
        self.doc_metadata[doc_id] = metadata or {}
        self.doc_lengths[doc_id] = len(tokens)

        term_counts = Counter(tokens)
        seen_terms = set()

        for term, freq in term_counts.items():
            self.inverted_index[term][doc_id] = freq
            if term not in seen_terms:
                self.doc_freqs[term] += 1
                seen_terms.add(term)

        self.doc_count += 1
        self.avgdl = sum(self.doc_lengths.values()) / max(self.doc_count, 1)

    def remove_document(self, doc_id: str):
        """Remove a document from the index."""
        if doc_id not in self.doc_texts:
            return

        tokens = self._tokenize(self.doc_texts[doc_id])
        seen_terms = set()

        for token in tokens:
            if token not in seen_terms:
                if token in self.inverted_index and doc_id in self.inverted_index[token]:
                    del self.inverted_index[token][doc_id]
                    self.doc_freqs[token] = max(0, self.doc_freqs[token] - 1)
                    if not self.inverted_index[token]:
                        del self.inverted_index[token]
                        del self.doc_freqs[token]
                seen_terms.add(token)

        del self.doc_texts[doc_id]
        del self.doc_lengths[doc_id]
        if doc_id in self.doc_metadata:
            del self.doc_metadata[doc_id]
        self.doc_count -= 1
        self.avgdl = sum(self.doc_lengths.values()) / max(self.doc_count, 1) if self.doc_count > 0 else 0

    def search(self, query: str, limit: int = 10) -> List[Tuple[str, float]]:
        """Search using BM25 scoring. Returns list of (doc_id, score)."""
        if self.doc_count == 0:
            return []

        query_tokens = self._tokenize(query)
        scores: Dict[str, float] = defaultdict(float)

        for term in query_tokens:
            if term not in self.inverted_index:
                continue

            df = self.doc_freqs.get(term, 0)
            idf = math.log((self.doc_count - df + 0.5) / (df + 0.5) + 1.0)

            for doc_id, tf in self.inverted_index[term].items():
                dl = self.doc_lengths[doc_id]
                tf_norm = (tf * (self.k1 + 1)) / (tf + self.k1 * (1 - self.b + self.b * dl / self.avgdl))
                scores[doc_id] += idf * tf_norm

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return ranked[:limit]

    def clear(self):
        """Clear the entire index."""
        self.doc_count = 0
        self.avgdl = 0.0
        self.doc_lengths.clear()
        self.doc_freqs.clear()
        self.inverted_index.clear()
        self.doc_texts.clear()
        self.doc_metadata.clear()
