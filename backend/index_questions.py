"""
Utility script to index existing questions in ChromaDB.
Run this script to add all existing questions from MongoDB to ChromaDB for semantic search.
"""

import asyncio
import os
import sys

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

# Override ChromaDB host for local execution
os.environ["CHROMADB_HOST"] = "http://localhost:8002"
# Override MongoDB URL for local execution
os.environ["MONGO_DB"] = "mongodb://localhost:27017"

from app.db.mongodb.mongodb import init_mongodb
from app.services.chromadb_service import ChromaDBService


async def index_existing_questions():
    """Index all existing questions in ChromaDB."""

    # Initialize services
    chromadb_service = ChromaDBService()
    db = init_mongodb()
    questions_collection = db.get_collection("questions")

    print("Starting to index existing questions...")

    # Get all questions from MongoDB
    questions = await questions_collection.find({}).to_list(length=None)

    print(f"Found {len(questions)} questions to index")

    indexed_count = 0
    for question in questions:
        try:
            await chromadb_service.add_question(
                question_id=str(question["_id"]),
                title=question["title"],
                description=question["description"],
                tags=question["tags"],
                author_id=question["author_id"],
            )
            indexed_count += 1
            print(
                f"Indexed question {indexed_count}/{len(questions)}: {question['title'][:50]}..."
            )

        except Exception as e:
            print(f"Error indexing question {question['_id']}: {e}")

    print(f"Successfully indexed {indexed_count} questions in ChromaDB!")


if __name__ == "__main__":
    asyncio.run(index_existing_questions())
