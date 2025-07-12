"""
ChromaDB service for semantic search functionality.
"""

from typing import Dict, List, Optional

import chromadb
from app.config.settings import settings


class ChromaDBService:
    """Service for managing ChromaDB operations for semantic search."""

    def __init__(self):
        # Parse ChromaDB host and port from URL
        chromadb_url = settings.CHROMADB_HOST
        if chromadb_url.startswith("http://"):
            chromadb_url = chromadb_url[7:]  # Remove http://
        elif chromadb_url.startswith("https://"):
            chromadb_url = chromadb_url[8:]  # Remove https://

        if ":" in chromadb_url:
            host, port = chromadb_url.split(":", 1)
            port = int(port)
        else:
            host = chromadb_url
            port = 8000

        self.client = chromadb.HttpClient(host=host, port=port)
        self.collection_name = "qa_posts"
        self.collection = None
        self._initialize_collection()

    def _initialize_collection(self):
        """Initialize the ChromaDB collection."""
        try:
            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"description": "Q&A posts for semantic search"},
            )
        except Exception as e:
            print(f"Error initializing ChromaDB collection: {e}")
            self.collection = None

    async def add_question(
        self,
        question_id: str,
        title: str,
        description: str,
        tags: List[str],
        author_id: str,
    ) -> bool:
        """Add a question to the vector database."""
        if not self.collection:
            return False

        try:
            # Combine title, description and tags for embedding
            text_content = f"{title} {description} {' '.join(tags)}"

            # Metadata for filtering and retrieval
            metadata = {
                "question_id": question_id,
                "title": title,
                "type": "question",
                "tags": tags,
                "author_id": author_id,
            }

            # Add to ChromaDB
            self.collection.add(
                documents=[text_content], metadatas=[metadata], ids=[question_id]
            )
            return True

        except Exception as e:
            print(f"Error adding question to ChromaDB: {e}")
            return False

    async def add_answer(
        self,
        answer_id: str,
        question_id: str,
        content: str,
        author_id: str,
        question_title: str = "",
    ) -> bool:
        """Add an answer to the vector database."""
        if not self.collection:
            return False

        try:
            # Combine answer content with question title for context
            text_content = f"{question_title} {content}".strip()

            # Metadata for filtering and retrieval
            metadata = {
                "answer_id": answer_id,
                "question_id": question_id,
                "type": "answer",
                "author_id": author_id,
                "question_title": question_title,
            }

            # Add to ChromaDB
            self.collection.add(
                documents=[text_content], metadatas=[metadata], ids=[answer_id]
            )
            return True

        except Exception as e:
            print(f"Error adding answer to ChromaDB: {e}")
            return False

    async def update_question(
        self, question_id: str, title: str, description: str, tags: List[str]
    ) -> bool:
        """Update a question in the vector database."""
        if not self.collection:
            return False

        try:
            # Combine title, description and tags for embedding
            text_content = f"{title} {description} {' '.join(tags)}"

            # Update metadata
            metadata = {"title": title, "tags": tags, "type": "question"}

            # Update in ChromaDB
            self.collection.update(
                ids=[question_id], documents=[text_content], metadatas=[metadata]
            )
            return True

        except Exception as e:
            print(f"Error updating question in ChromaDB: {e}")
            return False

    async def delete_question(self, question_id: str) -> bool:
        """Delete a question from the vector database."""
        if not self.collection:
            return False

        try:
            # Delete the question
            self.collection.delete(ids=[question_id])

            # Also delete related answers
            results = self.collection.get(
                where={"question_id": question_id, "type": "answer"}
            )

            if results and results["ids"]:
                self.collection.delete(ids=results["ids"])

            return True

        except Exception as e:
            print(f"Error deleting question from ChromaDB: {e}")
            return False

    async def delete_answer(self, answer_id: str) -> bool:
        """Delete an answer from the vector database."""
        if not self.collection:
            return False

        try:
            self.collection.delete(ids=[answer_id])
            return True

        except Exception as e:
            print(f"Error deleting answer from ChromaDB: {e}")
            return False

    async def semantic_search(
        self,
        query: str,
        limit: int = 10,
        question_only: bool = False,
        tags_filter: Optional[List[str]] = None,
    ) -> List[Dict]:
        """Perform semantic search on questions and answers."""
        if not self.collection:
            return []

        try:
            # Build where clause for filtering
            where_clause = {}

            if question_only:
                where_clause["type"] = "question"

            if tags_filter:
                # Note: ChromaDB doesn't support array contains directly
                # We'll filter results after retrieval
                pass

            # Perform semantic search
            results = self.collection.query(
                query_texts=[query],
                n_results=(
                    limit * 2 if tags_filter else limit
                ),  # Get more if we need to filter
                where=where_clause if where_clause else None,
            )

            # Process results
            search_results: List[Dict] = []

            if not results:
                return search_results

            ids = results.get("ids")
            metadatas = results.get("metadatas")
            documents = results.get("documents")
            distances = results.get("distances")

            if not ids or not metadatas or not documents:
                return search_results

            if not ids[0] or not metadatas[0] or not documents[0]:
                return search_results

            for i in range(len(ids[0])):
                try:
                    metadata = metadatas[0][i] if i < len(metadatas[0]) else {}
                    document = documents[0][i] if i < len(documents[0]) else ""
                    distance = 0

                    if distances and distances[0] and i < len(distances[0]):
                        distance = distances[0][i]

                    # Apply tags filter if specified
                    if tags_filter and metadata.get("type") == "question":
                        question_tags = metadata.get("tags", [])
                        # Ensure question_tags is a list and tags_filter items are strings
                        if isinstance(question_tags, list):
                            if not any(
                                tag in question_tags
                                for tag in tags_filter
                                if isinstance(tag, str)
                            ):
                                continue
                        else:
                            continue

                    result = {
                        "id": ids[0][i],
                        "type": metadata.get("type"),
                        "content": document,
                        "metadata": metadata,
                        "similarity_score": 1
                        - distance,  # Convert distance to similarity
                    }

                    search_results.append(result)

                    # Stop if we have enough results
                    if len(search_results) >= limit:
                        break

                except (IndexError, TypeError):
                    # Skip malformed results
                    continue

            return search_results

        except Exception as e:
            print(f"Error performing semantic search: {e}")
            return []

    async def get_similar_questions(
        self, question_id: str, limit: int = 5
    ) -> List[Dict]:
        """Get questions similar to a given question."""
        if not self.collection:
            return []

        try:
            # Get the question's content
            result = self.collection.get(ids=[question_id], include=["documents"])

            if not result or not result["documents"]:
                return []

            question_content = result["documents"][0]

            # Find similar questions
            similar_results = await self.semantic_search(
                query=question_content,
                limit=limit + 1,  # +1 because the original question will be included
                question_only=True,
            )

            # Filter out the original question
            filtered_results = [r for r in similar_results if r["id"] != question_id]

            return filtered_results[:limit]

        except Exception as e:
            print(f"Error getting similar questions: {e}")
            return []

    async def search_by_tags(self, tags: List[str], limit: int = 10) -> List[Dict]:
        """Search for questions by tags with semantic similarity."""
        if not self.collection:
            return []

        # Create a query from the tags
        tag_query = " ".join(tags)

        return await self.semantic_search(
            query=tag_query, limit=limit, question_only=True, tags_filter=tags
        )

    async def get_collection_stats(self) -> Dict:
        """Get statistics about the ChromaDB collection."""
        if not self.collection:
            return {"error": "Collection not initialized"}

        try:
            # Get collection info
            count = self.collection.count()

            # Get some sample data to analyze
            results = self.collection.get(limit=100, include=["metadatas"])

            # Count by type
            questions_count = 0
            answers_count = 0

            if results and results["metadatas"]:
                for metadata in results["metadatas"]:
                    if metadata.get("type") == "question":
                        questions_count += 1
                    elif metadata.get("type") == "answer":
                        answers_count += 1

            return {
                "total_documents": count,
                "questions": questions_count,
                "answers": answers_count,
                "collection_name": self.collection_name,
            }

        except Exception as e:
            return {"error": f"Error getting stats: {e}"}


# Global instance
chromadb_service = ChromaDBService()
