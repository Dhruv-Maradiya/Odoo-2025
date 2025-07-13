"""
Q&A service layer for questions, answers, voting, and notifications.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.mongodb.collections import mongodb_instance
from app.models.qa_models import (
    AnswerCreateRequest,
    AnswerModel,
    AnswerUpdateRequest,
    NotificationModel,
    NotificationType,
    QuestionAuthorModel,
    QuestionCreateRequest,
    QuestionListModel,
    QuestionModel,
    QuestionSearchRequest,
    QuestionSearchResponse,
    QuestionUpdateRequest,
    VoteRequest,
    VoteType,
)
from app.services.chromadb_service import chromadb_service
from bson import ObjectId
from fastapi import BackgroundTasks
from pymongo import DESCENDING
from bson import ObjectId


class QAService:
    """Service class for Q&A operations."""

    def __init__(self):
        self.db = mongodb_instance
        self.questions = self.db.get_collection("questions")
        self.answers = self.db.get_collection("answers")
        self.votes = self.db.get_collection("votes")
        self.notifications = self.db.get_collection("notifications")
        self.tags = self.db.get_collection("tags")
        self.user_stats = self.db.get_collection("user_stats")

    async def create_question(
        self,
        question_data: QuestionCreateRequest,
        author_id: str,
        author_name: str,
        author_email: str,
    ) -> Optional[QuestionModel]:
        """Create a new question."""
        now = datetime.now(timezone.utc)

        question_doc = {
            "author_id": author_id,
            "title": question_data.title,
            "description": question_data.description,
            "tags": question_data.tags,
            "images": question_data.images or [],
            "view_count": 0,
            "answer_count": 0,
            "has_accepted_answer": False,
            "created_at": now,
            "updated_at": None,
        }

        test = await self.questions.insert_one(question_doc)
        # Add to ChromaDB for semantic search
        await chromadb_service.add_question(
            question_id=str(test.inserted_id),
            title=question_data.title,
            description=question_data.description,
            tags=question_data.tags,
            author_id=author_id,
        )

        # Update tag statistics
        # await self._update_tag_stats(question_data.tags)

        # Update user statistics
        # await self._increment_user_stat(author_id, "questions_asked")
        return await self.get_question_by_id(str(test.inserted_id))

    async def get_question_by_id(
        self,
        question_id: str,
        increment_view: bool = False,
        user_id: Optional[str] = None,
    ) -> Optional[QuestionModel]:
        """Get a question by ID with all answers and comments."""
        if increment_view:
            await self.questions.update_one(
                {"_id": ObjectId(question_id)}, {"$inc": {"view_count": 1}}
            )

        question_doc = await self.questions.find_one({"_id": ObjectId(question_id)})
        print(f"{question_doc=}")
        if not question_doc:
            return None

        # Get author info
        author = await self._get_user_info(question_doc["author_id"])

        if not author:
            return None

        # Get user's vote if user_id is provided
        user_vote = None
        if user_id:
            vote_doc = await self.votes.find_one(
                {"question_id": question_id, "user_id": user_id}
            )
            if vote_doc:
                user_vote = vote_doc["vote_type"]

        # Get answers with comments and votes
        answers = await self._get_question_answers(question_id, user_id)

        return QuestionModel(
            question_id=str(question_doc["_id"]),
            author=author,
            title=question_doc["title"],
            description=question_doc["description"],
            tags=question_doc["tags"],
            images=question_doc.get("images", []),
            view_count=question_doc["view_count"],
            answer_count=actual_answer_count,
            has_accepted_answer=question_doc["has_accepted_answer"],
            is_flagged=question_doc.get("is_flagged", False),
            vote_count=question_doc.get("vote_count", 0),
            user_vote=user_vote,
            answers=answers,
            created_at=question_doc["created_at"],
            updated_at=question_doc.get("updated_at"),
        )

    async def update_question(
        self, question_id: str, update_data: QuestionUpdateRequest, user_id: str
    ) -> Optional[QuestionModel]:
        """Update a question (only by the author)."""
        question_doc = await self.questions.find_one(
            {"_id": question_id, "author_id": user_id}
        )
        if not question_doc:
            return None

        update_fields: Dict[str, Any] = {}
        if update_data.title is not None:
            update_fields["title"] = update_data.title
        if update_data.description is not None:
            update_fields["description"] = update_data.description
        if update_data.tags is not None:
            update_fields["tags"] = update_data.tags
        if update_data.images is not None:
            update_fields["images"] = update_data.images

        if update_fields:
            update_fields["updated_at"] = datetime.now(timezone.utc)
            await self.questions.update_one(
                {"_id": question_id}, {"$set": update_fields}
            )

            # Update in ChromaDB if title, description, or tags changed
            if any(
                field in update_fields for field in ["title", "description", "tags"]
            ):
                # Get updated question doc
                updated_question = await self.questions.find_one({"_id": question_id})
                if updated_question:
                    await chromadb_service.update_question(
                        question_id=question_id,
                        title=updated_question["title"],
                        description=updated_question["description"],
                        tags=updated_question["tags"],
                    )

        return await self.get_question_by_id(question_id)

    async def delete_question(self, question_id: str, user_id: str) -> bool:
        """Delete a question (only by the author)."""
        question_doc = await self.questions.find_one(
            {"_id": question_id, "author_id": user_id}
        )
        if not question_doc:
            return False

        # Delete related data
        await self.answers.delete_many({"question_id": question_id})
        await self.votes.delete_many({"question_id": question_id})
        await self.notifications.delete_many({"related_id": question_id})

        # Delete from ChromaDB
        await chromadb_service.delete_question(question_id)

        # Delete the question
        result = await self.questions.delete_one({"_id": question_id})
        return result.deleted_count > 0

    async def search_questions(
        self, search_request: QuestionSearchRequest, user_id: Optional[str]
    ) -> QuestionSearchResponse:
        """Search questions with filters and pagination."""

        # Build search filters
        filters: Dict[str, Any] = {}

        # Text search in title or description
        if search_request.query:
            filters["$or"] = [
                {"title": {"$regex": search_request.query, "$options": "i"}},
                {"description": {"$regex": search_request.query, "$options": "i"}},
            ]

        if search_request.tags:
            filters["tags"] = {"$in": search_request.tags}

        if search_request.author_id:
            filters["author_id"] = search_request.author_id

        if search_request.has_accepted_answer is not None:
            filters["has_accepted_answer"] = search_request.has_accepted_answer

        # Count total results
        total = await self.questions.count_documents(filters)

        # Calculate pagination
        skip = (search_request.page - 1) * search_request.limit

        # Sort configuration - ensure sort_by has a default value
        sort_field = search_request.sort_by or "created_at"
        sort_direction = DESCENDING if search_request.order == "desc" else 1

        # Execute query
        cursor = (
            self.questions.find(filters)
            .sort(sort_field, sort_direction)
            .skip(skip)
            .limit(search_request.limit)
        )
        question_docs = await cursor.to_list(length=search_request.limit)

        # Convert to response models
        questions = []
        for doc in question_docs:
            author = await self._get_user_info(doc["author_id"])
            if author:
                # Get user's vote if user_id is provided
                user_vote = None
                if user_id:
                    vote_doc = await self.votes.find_one(
                        {"question_id": str(doc["_id"]), "user_id": user_id}
                    )
                    if vote_doc:
                        user_vote = vote_doc["vote_type"]

                questions.append(
                    QuestionListModel(
                        question_id=str(doc["_id"]),
                        author=author,
                        title=doc["title"],
                        tags=doc["tags"],
                        view_count=doc["view_count"],
                        answer_count=doc["answer_count"],
                        has_accepted_answer=doc["has_accepted_answer"],
                        is_flagged=doc.get("is_flagged", False),
                        vote_count=doc.get("vote_count", 0),
                        user_vote=user_vote,
                        created_at=doc["created_at"],
                    )
                )

        return QuestionSearchResponse(
            questions=questions,
            total=total,
            page=search_request.page,
            limit=search_request.limit,
            has_next=skip + search_request.limit < total,
            has_prev=search_request.page > 1,
        )

    async def _semantic_search_questions(
        self, search_request: QuestionSearchRequest, user_id: Optional[str]
    ) -> QuestionSearchResponse:
        """Perform semantic search using ChromaDB."""

        # Ensure we have a query
        if not search_request.query:
            return QuestionSearchResponse(
                questions=[],
                total=0,
                page=search_request.page,
                limit=search_request.limit,
                has_next=False,
                has_prev=False,
            )

        # Perform semantic search
        semantic_results = await chromadb_service.semantic_search(
            query=search_request.query,
            limit=search_request.limit * 3,  # Get more results to filter
            question_only=True,
            tags_filter=search_request.tags,
        )

        # Extract question IDs from semantic results
        question_ids = [result["id"] for result in semantic_results]

        if not question_ids:
            return QuestionSearchResponse(
                questions=[],
                total=0,
                page=search_request.page,
                limit=search_request.limit,
                has_next=False,
                has_prev=False,
            )

        # Build additional filters
        filters: Dict[str, Any] = {"_id": {"$in": question_ids}}

        if search_request.author_id:
            filters["author_id"] = search_request.author_id

        if search_request.has_accepted_answer is not None:
            filters["has_accepted_answer"] = search_request.has_accepted_answer

        # Get question documents from MongoDB
        question_docs = await self.questions.find(filters).to_list(length=None)

        # Create a mapping for quick lookup
        question_map = {doc["_id"]: doc for doc in question_docs}

        # Sort by semantic similarity and apply pagination
        start_idx = (search_request.page - 1) * search_request.limit
        end_idx = start_idx + search_request.limit

        questions = []
        for result in semantic_results[start_idx:end_idx]:
            question_id = result["id"]
            if question_id in question_map:
                doc = question_map[question_id]
                author = await self._get_user_info(doc["author_id"])
                if author:
                    # Get user's vote if user_id is provided
                    user_vote = None
                    if user_id:
                        vote_doc = await self.votes.find_one(
                            {"question_id": question_id, "user_id": user_id}
                        )
                        if vote_doc:
                            user_vote = vote_doc["vote_type"]

                    questions.append(
                        QuestionListModel(
                            question_id=str(doc["_id"]),
                            author=author,
                            title=doc["title"],
                            tags=doc["tags"],
                            view_count=doc["view_count"],
                            answer_count=actual_answer_count,
                            has_accepted_answer=doc["has_accepted_answer"],
                            vote_count=doc.get("vote_count", 0),
                            user_vote=user_vote,
                            created_at=doc["created_at"],
                        )
                    )

        total_semantic_results = len(semantic_results)

        return QuestionSearchResponse(
            questions=questions,
            total=total_semantic_results,
            page=search_request.page,
            limit=search_request.limit,
            has_next=end_idx < total_semantic_results,
            has_prev=search_request.page > 1,
        )

    async def create_answer(
        self,
        question_id: str,
        answer_data: AnswerCreateRequest,
        author_id: str,
        author_name: str,
        author_email: str,
    ) -> Optional[AnswerModel]:
        """Create an answer to a question."""
        # Check if question exists
        question = await self.questions.find_one({"_id": ObjectId(question_id)})
        if not question:
            return None

        answer_id = ObjectId()
        now = datetime.now(timezone.utc)

        answer_doc = {
            "_id": answer_id,
            "question_id": question_id,
            "author_id": author_id,
            "content": answer_data.content,
            "images": answer_data.images or [],
            "is_accepted": False,
            "vote_count": 0,
            "upvotes": 0,
            "downvotes": 0,
            "created_at": now,
            "updated_at": None,
        }

        await self.answers.insert_one(answer_doc)

        # Add to ChromaDB for semantic search
        await chromadb_service.add_answer(
            answer_id=str(answer_id),
            question_id=question_id,
            content=answer_data.content,
            author_id=author_id,
            question_title=question.get("title", ""),
        )

        # Update question answer count
        await self.questions.update_one(
            {"_id": question_id}, {"$inc": {"answer_count": 1}}
        )

        # Update user statistics
        await self._increment_user_stat(author_id, "answers_given")

        # Create notification for question author
        if question["author_id"] != author_id:
            await self._create_notification(
                user_id=question["author_id"],
                notification_type=NotificationType.QUESTION_ANSWERED,
                title="New Answer",
                message=f"{author_name} answered your question: {question['title']}",
                related_id=question_id,
            )

        return await self._get_answer_by_id(answer_id, user_id=user_id)

    async def vote_answer(
        self, answer_id: str, vote_data: VoteRequest, user_id: str
    ) -> Optional[AnswerModel]:
        """Vote on an answer."""
        answer = await self.answers.find_one({"_id": answer_id})
        if not answer:
            return None

        # Check if user already voted
        existing_vote = await self.votes.find_one(
            {"answer_id": answer_id, "user_id": user_id}
        )

        if existing_vote:
            # Update existing vote
            old_vote_type = existing_vote["vote_type"]
            await self.votes.update_one(
                {"_id": existing_vote["_id"]},
                {"$set": {"vote_type": vote_data.vote_type}},
            )

            # Update vote counts
            if old_vote_type != vote_data.vote_type:
                if old_vote_type == VoteType.UPVOTE:
                    await self.answers.update_one(
                        {"_id": answer_id}, {"$inc": {"upvotes": -1, "vote_count": -1}}
                    )
                else:
                    await self.answers.update_one(
                        {"_id": answer_id}, {"$inc": {"downvotes": -1, "vote_count": 1}}
                    )

                if vote_data.vote_type == VoteType.UPVOTE:
                    await self.answers.update_one(
                        {"_id": answer_id}, {"$inc": {"upvotes": 1, "vote_count": 1}}
                    )
                else:
                    await self.answers.update_one(
                        {"_id": answer_id}, {"$inc": {"downvotes": 1, "vote_count": -1}}
                    )
        else:
            # Create new vote
            vote_id = str(uuid.uuid4())
            vote_doc = {
                "_id": vote_id,
                "answer_id": answer_id,
                "user_id": user_id,
                "vote_type": vote_data.vote_type,
                "created_at": datetime.now(timezone.utc),
            }
            await self.votes.insert_one(vote_doc)

            # Update vote counts
            if vote_data.vote_type == VoteType.UPVOTE:
                await self.answers.update_one(
                    {"_id": answer_id}, {"$inc": {"upvotes": 1, "vote_count": 1}}
                )
            else:
                await self.answers.update_one(
                    {"_id": answer_id}, {"$inc": {"downvotes": 1, "vote_count": -1}}
                )

        return await self._get_answer_by_id(answer_id)

    async def vote_question(
        self, question_id: str, vote_data: VoteRequest, user_id: str
    ) -> Optional[QuestionModel]:
        """Vote on a question (upvote or downvote)."""
        question = await self.questions.find_one({"_id": ObjectId(question_id)})
        if not question:
            return None

        # Check if user already voted
        existing_vote = await self.votes.find_one(
            {"question_id": question_id, "user_id": user_id}
        )

        if existing_vote:
            old_vote_type = existing_vote["vote_type"]
            await self.votes.update_one(
                {"_id": existing_vote["_id"]},
                {"$set": {"vote_type": vote_data.vote_type}},
            )

            # Update vote counts
            if old_vote_type != vote_data.vote_type:
                if old_vote_type == VoteType.UPVOTE:
                    await self.questions.update_one(
                        {"_id": ObjectId(question_id)},
                        {"$inc": {"upvotes": -1, "vote_count": -1}},
                    )
                else:
                    await self.questions.update_one(
                        {"_id": ObjectId(question_id)},
                        {"$inc": {"downvotes": -1, "vote_count": 1}},
                    )

                if vote_data.vote_type == VoteType.UPVOTE:
                    await self.questions.update_one(
                        {"_id": ObjectId(question_id)},
                        {"$inc": {"upvotes": 1, "vote_count": 1}},
                    )
                else:
                    await self.questions.update_one(
                        {"_id": ObjectId(question_id)},
                        {"$inc": {"downvotes": 1, "vote_count": -1}},
                    )
        else:
            # Create new vote
            vote_id = str(uuid.uuid4())
            vote_doc = {
                "_id": vote_id,
                "question_id": question_id,
                "user_id": user_id,
                "vote_type": vote_data.vote_type,
                "created_at": datetime.now(timezone.utc),
            }
            await self.votes.insert_one(vote_doc)

            # Update vote counts
            if vote_data.vote_type == VoteType.UPVOTE:
                await self.questions.update_one(
                    {"_id": ObjectId(question_id)},
                    {"$inc": {"upvotes": 1, "vote_count": 1}},
                )
            else:
                await self.questions.update_one(
                    {"_id": ObjectId(question_id)},
                    {"$inc": {"downvotes": 1, "vote_count": -1}},
                )

        return await self.get_question_by_id(question_id, user_id=user_id)

    async def accept_answer(
        self, question_id: str, answer_id: str, user_id: str
    ) -> bool:
        """Accept an answer (only by question owner)."""
        question = await self.questions.find_one(
            {"_id": question_id, "author_id": user_id}
        )
        if not question:
            return False

        answer = await self.answers.find_one(
            {"_id": answer_id, "question_id": question_id}
        )
        if not answer:
            return False

        # Unaccept all other answers for this question
        await self.answers.update_many(
            {"question_id": question_id}, {"$set": {"is_accepted": False}}
        )

        # Accept this answer
        await self.answers.update_one(
            {"_id": answer_id}, {"$set": {"is_accepted": True}}
        )

        # Update question
        await self.questions.update_one(
            {"_id": question_id}, {"$set": {"has_accepted_answer": True}}
        )

        # Update user statistics
        await self._increment_user_stat(answer["author_id"], "accepted_answers")

        # Create notification for answer author
        if answer["author_id"] != user_id:
            await self._create_notification(
                user_id=answer["author_id"],
                notification_type=NotificationType.ANSWER_ACCEPTED,
                title="Answer Accepted",
                message=f"Your answer was accepted for: {question['title']}",
                related_id=question_id,
            )

        return True

    async def get_user_notifications(
        self, user_id: str, limit: int = 20, offset: int = 0
    ) -> List[NotificationModel]:
        """Get user notifications."""
        cursor = (
            self.notifications.find({"user_id": user_id})
            .sort("created_at", DESCENDING)
            .skip(offset)
            .limit(limit)
        )
        notification_docs = await cursor.to_list(length=limit)

        notifications = []
        for doc in notification_docs:
            notifications.append(
                NotificationModel(
                    notification_id=doc["_id"],
                    user_id=doc["user_id"],
                    type=doc["type"],
                    title=doc["title"],
                    message=doc["message"],
                    related_id=doc.get("related_id"),
                    is_read=doc["is_read"],
                    created_at=doc["created_at"],
                )
            )

        return notifications

    async def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read."""
        result = await self.notifications.update_one(
            {"_id": notification_id, "user_id": user_id}, {"$set": {"is_read": True}}
        )
        return result.modified_count > 0

    async def get_notification_count(self, user_id: str) -> Dict[str, int]:
        """Get notification counts for a user."""
        total = await self.notifications.count_documents({"user_id": user_id})
        unread = await self.notifications.count_documents(
            {"user_id": user_id, "is_read": False}
        )

        return {"total": total, "unread": unread}

    async def update_answer(
        self, answer_id: str, answer_data: AnswerUpdateRequest, user_id: str
    ) -> Optional[AnswerModel]:
        """Update an answer (only by the author)."""
        answer_doc = await self.answers.find_one(
            {"_id": answer_id, "author_id": user_id}
        )
        if not answer_doc:
            return None

        update_fields = {
            "content": answer_data.content,
            "updated_at": datetime.now(timezone.utc),
        }

        if answer_data.images is not None:
            update_fields["images"] = answer_data.images

        await self.answers.update_one({"_id": answer_id}, {"$set": update_fields})

        return await self._get_answer_by_id(answer_id)

    async def delete_answer(self, answer_id: str, user_id: str) -> bool:
        """Delete an answer (only by the author)."""
        answer_doc = await self.answers.find_one(
            {"_id": answer_id, "author_id": user_id}
        )
        if not answer_doc:
            return False

        question_id = answer_doc["question_id"]

        # Delete related data
        await self.votes.delete_many({"answer_id": answer_id})
        await self.notifications.delete_many({"related_id": answer_id})

        # Delete from ChromaDB
        await chromadb_service.delete_answer(answer_id)

        # Delete the answer
        result = await self.answers.delete_one({"_id": answer_id})

        if result.deleted_count > 0:
            # Update question answer count
            await self.questions.update_one(
                {"_id": question_id}, {"$inc": {"answer_count": -1}}
            )
            return True

        return False

    async def remove_vote(self, answer_id: str, user_id: str) -> bool:
        """Remove a user's vote from an answer."""
        vote_doc = await self.votes.find_one(
            {"answer_id": answer_id, "user_id": user_id}
        )
        if not vote_doc:
            return False

        question_id = answer_doc["question_id"]

        # Remove the vote
        result = await self.votes.delete_one({"_id": vote_doc["_id"]})

        if result.deleted_count > 0:
            # Update answer vote counts
            update_fields = {"vote_count": -1}
            if vote_type == VoteType.UPVOTE:
                update_fields["upvotes"] = -1
            else:
                update_fields["downvotes"] = -1

            await self.answers.update_one({"_id": answer_id}, {"$inc": update_fields})
            return True

        return False

    async def create_comment(
        self,
        answer_id: str,
        comment_data: CommentCreateRequest,
        author_id: str,
        author_name: str,
        author_email: str,
        author_picture: str,
    ) -> Optional[CommentModel]:
        """Create a comment on an answer."""
        # Verify answer exists
        answer_doc = await self.answers.find_one({"_id": answer_id})
        if not answer_doc:
            return None

        comment_id = str(uuid.uuid4())
        comment_doc = {
            "_id": comment_id,
            "answer_id": answer_id,
            "author_id": author_id,
            "content": comment_data.content,
            "created_at": datetime.now(timezone.utc),
        }

        await self.comments.insert_one(comment_doc)

        # Create notification for answer author
        if answer_doc["author_id"] != author_id:
            await self._create_notification(
                user_id=answer_doc["author_id"],
                notification_type=NotificationType.ANSWER_COMMENTED,
                title="New comment on your answer",
                message=f"{author_name} commented on your answer",
                related_id=answer_id,
            )

        # Return the comment
        author = QuestionAuthorModel(
            user_id=author_id,
            name=author_name,
            email=author_email,
            picture=author_picture,
        )

        return CommentModel(
            comment_id=comment_id,
            answer_id=answer_id,
            author=author,
            content=comment_data.content,
            created_at=datetime.now(timezone.utc),
        )

    async def delete_comment(self, comment_id: str, user_id: str) -> bool:
        """Delete a comment (only by the author)."""
        comment_doc = await self.comments.find_one(
            {"_id": comment_id, "author_id": user_id}
        )
        if not comment_doc:
            return False

        result = await self.comments.delete_one({"_id": comment_id})
        return result.deleted_count > 0

    async def admin_delete_question(self, question_id: str) -> bool:
        """Admin delete: Delete any question (with all related data)."""
        try:
            # Delete all related answers
            await self.answers.delete_many({"question_id": question_id})

            # Delete all related comments (for answers of this question)
            answer_ids = []
            async for answer in self.answers.find({"question_id": question_id}):
                answer_ids.append(str(answer["_id"]))

            if answer_ids:
                await self.comments.delete_many({"answer_id": {"$in": answer_ids}})

            # Delete all votes for the question and its answers
            await self.votes.delete_many({"question_id": question_id})

            # Delete the question itself
            result = await self.questions.delete_one({"_id": ObjectId(question_id)})

            return result.deleted_count > 0
        except Exception:
            return False

    async def admin_delete_answer(self, answer_id: str) -> bool:
        """Admin delete: Delete any answer (with all related data)."""
        try:
            # Delete all related comments
            await self.comments.delete_many({"answer_id": answer_id})

            # Delete all votes for the answer
            await self.votes.delete_many({"answer_id": answer_id})

            # Delete the answer itself
            result = await self.answers.delete_one({"_id": answer_id})

            return result.deleted_count > 0
        except Exception:
            return False

    async def admin_delete_comment(self, comment_id: str) -> bool:
        """Admin delete: Delete any comment."""
        try:
            result = await self.comments.delete_one({"_id": comment_id})
            return result.deleted_count > 0
        except Exception:
            return False

    async def admin_unflag_question(self, question_id: str) -> bool:
        """Admin unflag: Remove flag from a question."""
        result = await self.questions.update_one(
            {"_id": question_id},
            {
                "$unset": {
                    "is_flagged": "",
                    "flag_reason": "",
                    "flagged_by": "",
                    "flagged_at": "",
                }
            },
        )
        return result.modified_count > 0

    async def admin_get_platform_stats(
        self, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Admin stats: Get comprehensive platform statistics."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Basic counts
        total_questions = await self.questions.count_documents({})
        total_answers = await self.answers.count_documents({})
        total_votes = await self.votes.count_documents({})

        # Today's activity
        questions_today = await self.questions.count_documents(
            {"created_at": {"$gte": today_start}}
        )
        answers_today = await self.answers.count_documents(
            {"created_at": {"$gte": today_start}}
        )

        # User stats
        users_collection = self.db.get_collection("users")
        total_users = await users_collection.count_documents({})
        new_users_today = await users_collection.count_documents(
            {"created_at": {"$gte": today_start}}
        )

        # Top tags
        pipeline = [
            {"$unwind": "$tags"},
            {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        top_tags_cursor = self.questions.aggregate(pipeline)
        top_tags = await top_tags_cursor.to_list(length=10)

        return {
            "overview": {
                "total_questions": total_questions,
                "total_answers": total_answers,
                "total_users": total_users,
                "total_votes": total_votes,
            },
            "activity": {
                "questions_today": questions_today,
                "answers_today": answers_today,
                "new_users_today": new_users_today,
            },
            "top_tags": [
                {"tag": tag["_id"], "count": tag["count"]} for tag in top_tags
            ],
            "generated_at": now,
        }

    async def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        result = await self.notifications.update_many(
            {"user_id": user_id, "is_read": False}, {"$set": {"is_read": True}}
        )
        return result.modified_count

    # Helper methods
    async def _get_user_info(self, user_id: str) -> Optional[QuestionAuthorModel]:
        """Get user information from users collection."""
        user_collection = self.db.get_collection("users")
        user = await user_collection.find_one({"_id": ObjectId(user_id)})

        if user:
            return QuestionAuthorModel(
                user_id=str(user["_id"]),
                name=user["name"],
                email=user["email"],
                picture=user.get("picture", ""),
            )
        return None

    async def _get_question_answers(
        self, question_id: str, user_id: Optional[str] = None
    ) -> List[AnswerModel]:
        """Get all answers for a question."""
        cursor = self.answers.find({"question_id": question_id}).sort("created_at", 1)
        answers = []

        async for doc in cursor:
            author = await self._get_user_info(doc["author_id"])
            if author:
                # Get user's vote for this answer if user_id is provided
                user_vote = None
                if user_id:
                    vote_doc = await self.votes.find_one(
                        {"answer_id": doc["_id"], "user_id": user_id}
                    )
                    if vote_doc:
                        user_vote = vote_doc["vote_type"]

                answer = AnswerModel(
                    answer_id=str(doc["_id"]),
                    question_id=doc["question_id"],
                    content=doc["content"],
                    author=author,
                    created_at=doc["created_at"],
                    updated_at=doc.get("updated_at"),
                    vote_count=doc.get("vote_count", 0),
                    upvotes=doc.get("upvotes", 0),
                    downvotes=doc.get("downvotes", 0),
                    is_accepted=doc.get("is_accepted", False),
                    user_vote=user_vote,
                    comments=[],  # Comments would be loaded separately if needed
                )
                answers.append(answer)

        return answers

    async def _get_answer_by_id(
        self, answer_id: str, user_id: Optional[str] = None
    ) -> Optional[AnswerModel]:
        """Get an answer by ID."""
        doc = await self.answers.find_one({"_id": answer_id})
        if not doc:
            return None

        author = await self._get_user_info(doc["author_id"])
        if not author:
            return None

        # Get user's vote for this answer if user_id is provided
        user_vote = None
        if user_id:
            vote_doc = await self.votes.find_one(
                {"answer_id": answer_id, "user_id": user_id}
            )
            if vote_doc:
                user_vote = vote_doc["vote_type"]

        return AnswerModel(
            answer_id=doc["_id"],
            question_id=doc["question_id"],
            content=doc["content"],
            author=author,
            created_at=doc["created_at"],
            updated_at=doc.get("updated_at"),
            vote_count=doc.get("vote_count", 0),
            upvotes=doc.get("upvotes", 0),
            downvotes=doc.get("downvotes", 0),
            is_accepted=doc.get("is_accepted", False),
            user_vote=user_vote,
            comments=[],  # Comments would be loaded separately if needed
        )

    async def _get_answer_comments(self, answer_id: str) -> List[CommentModel]:
        """Get comments for an answer."""
        cursor = self.comments.find({"answer_id": answer_id}).sort("created_at", 1)
        comment_docs = await cursor.to_list(length=None)

        comments = []
        for doc in comment_docs:
            author = await self._get_user_info(doc["author_id"])
            if author:
                comments.append(
                    CommentModel(
                        comment_id=doc["_id"],
                        answer_id=doc["answer_id"],
                        author=author,
                        content=doc["content"],
                        created_at=doc["created_at"],
                        updated_at=doc.get("updated_at"),
                    )
                )

        return comments

    async def _create_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        related_id: Optional[str] = None,
    ):
        """Create a notification."""
        notification_id = str(uuid.uuid4())

        notification_doc = {
            "_id": notification_id,
            "user_id": user_id,
            "type": notification_type.value,
            "title": title,
            "message": message,
            "related_id": related_id,
            "created_at": datetime.now(timezone.utc),
            "is_read": False,
        }

        await self.notifications.insert_one(notification_doc)

    async def _update_tag_stats(self, tags: List[str]):
        """Update tag statistics."""
        for tag in tags:
            await self.tags.update_one(
                {"name": tag},
                {
                    "$inc": {"count": 1},
                    "$set": {"updated_at": datetime.now(timezone.utc)},
                },
                upsert=True,
            )

    async def _increment_user_stat(self, user_id: str, field: str, amount: int = 1):
        """Increment a user statistic."""
        await self.user_stats.update_one(
            {"user_id": user_id}, {"$inc": {field: amount}}, upsert=True
        )

    async def get_similar_questions(
        self, question_id: str, limit: int = 5
    ) -> List[QuestionListModel]:
        """Get questions similar to the given question using semantic search with fallback."""
        try:
            # First try ChromaDB semantic search
            similar_results = await chromadb_service.get_similar_questions(
                question_id=question_id, limit=limit
            )

            if similar_results:
                # Get question IDs from results and convert to ObjectId
                question_ids = [ObjectId(result["id"]) for result in similar_results]

                # Get question documents from MongoDB
                question_docs = await self.questions.find(
                    {"_id": {"$in": question_ids}}
                ).to_list(length=None)

                # Create a mapping for quick lookup
                question_map = {str(doc["_id"]): doc for doc in question_docs}

                # Build response maintaining the similarity order
                questions = []
                for result in similar_results:
                    question_id_str = result["id"]
                    if question_id_str in question_map:
                        doc = question_map[question_id_str]
                        author = await self._get_user_info(doc["author_id"])
                        if author:
                            questions.append(
                                QuestionListModel(
                                    question_id=str(doc["_id"]),
                                    author=author,
                                    title=doc["title"],
                                    tags=doc["tags"],
                                    view_count=doc["view_count"],
                                    answer_count=doc["answer_count"],
                                    has_accepted_answer=doc["has_accepted_answer"],
                                    created_at=doc["created_at"],
                                )
                            )

                return questions

            # Fallback: Use MongoDB text search and tag matching
            else:
                return await self._get_similar_questions_fallback(question_id, limit)

        except Exception as e:
            print(f"Error getting similar questions: {e}")
            # If there's an error with ChromaDB, use fallback
            return await self._get_similar_questions_fallback(question_id, limit)

    async def _get_similar_questions_fallback(
        self, question_id: str, limit: int = 5
    ) -> List[QuestionListModel]:
        """Fallback method to find similar questions using MongoDB text search and tag matching."""
        try:
            # Get the source question
            source_question = await self.questions.find_one(
                {"_id": ObjectId(question_id)}
            )
            if not source_question:
                return []

            # Build search criteria using tags and title words
            search_criteria = []

            # Add tag-based matching
            if source_question.get("tags"):
                search_criteria.append({"tags": {"$in": source_question["tags"]}})

            # Add text search on title and description
            title_words = source_question.get("title", "").split()
            if len(title_words) > 2:
                # Use some title words for text search
                search_text = " ".join(title_words[:3])  # Use first 3 words
                search_criteria.extend(
                    [
                        {"title": {"$regex": search_text, "$options": "i"}},
                        {"description": {"$regex": search_text, "$options": "i"}},
                    ]
                )

            if not search_criteria:
                return []

            # Find similar questions (exclude the source question)
            similar_docs = (
                await self.questions.find(
                    {"_id": {"$ne": ObjectId(question_id)}, "$or": search_criteria}
                )
                .limit(limit * 2)
                .to_list(length=None)
            )  # Get more to filter

            # Score and sort by relevance
            scored_questions = []
            source_tags = set(source_question.get("tags", []))

            for doc in similar_docs:
                score = 0
                doc_tags = set(doc.get("tags", []))

                # Tag overlap score
                tag_overlap = len(source_tags.intersection(doc_tags))
                if tag_overlap > 0:
                    score += tag_overlap * 2  # Weight tag matches heavily

                # Title similarity (simple word overlap)
                source_title_words = set(
                    source_question.get("title", "").lower().split()
                )
                doc_title_words = set(doc.get("title", "").lower().split())
                title_overlap = len(source_title_words.intersection(doc_title_words))
                score += title_overlap

                if score > 0:  # Only include questions with some similarity
                    scored_questions.append((doc, score))

            # Sort by score and take top results
            scored_questions.sort(key=lambda x: x[1], reverse=True)
            top_questions = scored_questions[:limit]

            # Build response
            questions = []
            for doc, _ in top_questions:
                author = await self._get_user_info(doc["author_id"])
                if author:
                    questions.append(
                        QuestionListModel(
                            question_id=str(doc["_id"]),
                            author=author,
                            title=doc["title"],
                            tags=doc["tags"],
                            view_count=doc["view_count"],
                            answer_count=doc["answer_count"],
                            has_accepted_answer=doc["has_accepted_answer"],
                            created_at=doc["created_at"],
                        )
                    )

            return questions

        except Exception as e:
            print(f"Error in fallback similar questions: {e}")
            return []

    async def semantic_search_all(self, query: str, limit: int = 20) -> Dict[str, List]:
        """Perform semantic search across both questions and answers."""
        results = await chromadb_service.semantic_search(
            query=query, limit=limit, question_only=False
        )

        question_results = []
        answer_results = []

        for result in results:
            if result["metadata"].get("type") == "question":
                question_id = result["id"]
                question_doc = await self.questions.find_one({"_id": question_id})
                if question_doc:
                    author = await self._get_user_info(question_doc["author_id"])
                    if author:
                        question_results.append(
                            {
                                "question": QuestionListModel(
                                    question_id=str(question_doc["_id"]),
                                    author=author,
                                    title=question_doc["title"],
                                    tags=question_doc["tags"],
                                    view_count=question_doc["view_count"],
                                    answer_count=question_doc["answer_count"],
                                    has_accepted_answer=question_doc[
                                        "has_accepted_answer"
                                    ],
                                    created_at=question_doc["created_at"],
                                ),
                                "similarity_score": result["similarity_score"],
                            }
                        )

            elif result["metadata"].get("type") == "answer":
                answer_id = result["id"]
                answer_doc = await self.answers.find_one({"_id": answer_id})
                if answer_doc:
                    author = await self._get_user_info(answer_doc["author_id"])
                    if author:
                        answer_results.append(
                            {
                                "answer": {
                                    "answer_id": answer_doc["_id"],
                                    "question_id": answer_doc["question_id"],
                                    "author": author,
                                    "content": answer_doc["content"],
                                    "created_at": answer_doc["created_at"],
                                },
                                "similarity_score": result["similarity_score"],
                            }
                        )

        return {"questions": question_results, "answers": answer_results}


# Global service instance
qa_service = QAService()
