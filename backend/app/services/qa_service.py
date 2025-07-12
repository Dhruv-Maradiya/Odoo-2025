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
    CommentCreateRequest,
    CommentModel,
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
from pymongo import DESCENDING


class QAService:
    """Service class for Q&A operations."""

    def __init__(self):
        self.db = mongodb_instance
        self.questions = self.db.get_collection("questions")
        self.answers = self.db.get_collection("answers")
        self.votes = self.db.get_collection("votes")
        self.comments = self.db.get_collection("comments")
        self.notifications = self.db.get_collection("notifications")
        self.tags = self.db.get_collection("tags")
        self.user_stats = self.db.get_collection("user_stats")

    async def create_question(self, question_data: QuestionCreateRequest, author_id: str, author_name: str, author_email: str) -> Optional[QuestionModel]:
        """Create a new question."""
        question_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        question_doc = {
            "_id": question_id,
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

        await self.questions.insert_one(question_doc)

        # Update tag statistics
        await self._update_tag_stats(question_data.tags)

        # Update user statistics
        await self._increment_user_stat(author_id, "questions_asked")

        return await self.get_question_by_id(question_id)

    async def get_question_by_id(self, question_id: str, increment_view: bool = False) -> Optional[QuestionModel]:
        """Get a question by ID with all answers and comments."""
        if increment_view:
            await self.questions.update_one(
                {"_id": question_id},
                {"$inc": {"view_count": 1}}
            )

        question_doc = await self.questions.find_one({"_id": question_id})
        if not question_doc:
            return None

        # Get author info
        author = await self._get_user_info(question_doc["author_id"])
        if not author:
            return None

        # Get answers with comments and votes
        answers = await self._get_question_answers(question_id)

        return QuestionModel(
            question_id=question_doc["_id"],
            author=author,
            title=question_doc["title"],
            description=question_doc["description"],
            tags=question_doc["tags"],
            images=question_doc.get("images", []),
            view_count=question_doc["view_count"],
            answer_count=question_doc["answer_count"],
            has_accepted_answer=question_doc["has_accepted_answer"],
            answers=answers,
            created_at=question_doc["created_at"],
            updated_at=question_doc.get("updated_at"),
        )

    async def update_question(self, question_id: str, update_data: QuestionUpdateRequest, user_id: str) -> Optional[QuestionModel]:
        """Update a question (only by the author)."""
        question_doc = await self.questions.find_one({"_id": question_id, "author_id": user_id})
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
                {"_id": question_id},
                {"$set": update_fields}
            )

        return await self.get_question_by_id(question_id)

    async def delete_question(self, question_id: str, user_id: str) -> bool:
        """Delete a question (only by the author)."""
        question_doc = await self.questions.find_one({"_id": question_id, "author_id": user_id})
        if not question_doc:
            return False

        # Delete related data
        await self.answers.delete_many({"question_id": question_id})
        await self.votes.delete_many({"question_id": question_id})
        await self.comments.delete_many({"question_id": question_id})
        await self.notifications.delete_many({"related_id": question_id})

        # Delete the question
        result = await self.questions.delete_one({"_id": question_id})
        return result.deleted_count > 0

    async def search_questions(self, search_request: QuestionSearchRequest) -> QuestionSearchResponse:
        """Search questions with filters and pagination."""
        filters: Dict[str, Any] = {}

        if search_request.query:
            filters["$text"] = {"$search": search_request.query}

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
        cursor = self.questions.find(filters).sort(sort_field, sort_direction).skip(skip).limit(search_request.limit)
        question_docs = await cursor.to_list(length=search_request.limit)

        # Convert to response models
        questions = []
        for doc in question_docs:
            author = await self._get_user_info(doc["author_id"])
            if author:
                questions.append(QuestionListModel(
                    question_id=doc["_id"],
                    author=author,
                    title=doc["title"],
                    tags=doc["tags"],
                    view_count=doc["view_count"],
                    answer_count=doc["answer_count"],
                    has_accepted_answer=doc["has_accepted_answer"],
                    created_at=doc["created_at"]
                ))

        return QuestionSearchResponse(
            questions=questions,
            total=total,
            page=search_request.page,
            limit=search_request.limit,
            has_next=skip + search_request.limit < total,
            has_prev=search_request.page > 1
        )

    async def create_answer(self, question_id: str, answer_data: AnswerCreateRequest, author_id: str, author_name: str, author_email: str) -> Optional[AnswerModel]:
        """Create an answer to a question."""
        # Check if question exists
        question = await self.questions.find_one({"_id": question_id})
        if not question:
            return None

        answer_id = str(uuid.uuid4())
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

        # Update question answer count
        await self.questions.update_one(
            {"_id": question_id},
            {"$inc": {"answer_count": 1}}
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
                related_id=question_id
            )

        return await self._get_answer_by_id(answer_id)

    async def vote_answer(self, answer_id: str, vote_data: VoteRequest, user_id: str) -> Optional[AnswerModel]:
        """Vote on an answer."""
        answer = await self.answers.find_one({"_id": answer_id})
        if not answer:
            return None

        # Check if user already voted
        existing_vote = await self.votes.find_one({"answer_id": answer_id, "user_id": user_id})

        if existing_vote:
            # Update existing vote
            old_vote_type = existing_vote["vote_type"]
            await self.votes.update_one(
                {"_id": existing_vote["_id"]},
                {"$set": {"vote_type": vote_data.vote_type}}
            )

            # Update vote counts
            if old_vote_type != vote_data.vote_type:
                if old_vote_type == VoteType.UPVOTE:
                    await self.answers.update_one(
                        {"_id": answer_id},
                        {"$inc": {"upvotes": -1, "vote_count": -1}}
                    )
                else:
                    await self.answers.update_one(
                        {"_id": answer_id},
                        {"$inc": {"downvotes": -1, "vote_count": 1}}
                    )

                if vote_data.vote_type == VoteType.UPVOTE:
                    await self.answers.update_one(
                        {"_id": answer_id},
                        {"$inc": {"upvotes": 1, "vote_count": 1}}
                    )
                else:
                    await self.answers.update_one(
                        {"_id": answer_id},
                        {"$inc": {"downvotes": 1, "vote_count": -1}}
                    )
        else:
            # Create new vote
            vote_id = str(uuid.uuid4())
            vote_doc = {
                "_id": vote_id,
                "answer_id": answer_id,
                "user_id": user_id,
                "vote_type": vote_data.vote_type,
                "created_at": datetime.now(timezone.utc)
            }
            await self.votes.insert_one(vote_doc)

            # Update vote counts
            if vote_data.vote_type == VoteType.UPVOTE:
                await self.answers.update_one(
                    {"_id": answer_id},
                    {"$inc": {"upvotes": 1, "vote_count": 1}}
                )
            else:
                await self.answers.update_one(
                    {"_id": answer_id},
                    {"$inc": {"downvotes": 1, "vote_count": -1}}
                )

        return await self._get_answer_by_id(answer_id)

    async def accept_answer(self, question_id: str, answer_id: str, user_id: str) -> bool:
        """Accept an answer (only by question owner)."""
        question = await self.questions.find_one({"_id": question_id, "author_id": user_id})
        if not question:
            return False

        answer = await self.answers.find_one({"_id": answer_id, "question_id": question_id})
        if not answer:
            return False

        # Unaccept all other answers for this question
        await self.answers.update_many(
            {"question_id": question_id},
            {"$set": {"is_accepted": False}}
        )

        # Accept this answer
        await self.answers.update_one(
            {"_id": answer_id},
            {"$set": {"is_accepted": True}}
        )

        # Update question
        await self.questions.update_one(
            {"_id": question_id},
            {"$set": {"has_accepted_answer": True}}
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
                related_id=question_id
            )

        return True

    async def get_user_notifications(self, user_id: str, limit: int = 20, offset: int = 0) -> List[NotificationModel]:
        """Get user notifications."""
        cursor = self.notifications.find({"user_id": user_id}).sort("created_at", DESCENDING).skip(offset).limit(limit)
        notification_docs = await cursor.to_list(length=limit)

        notifications = []
        for doc in notification_docs:
            notifications.append(NotificationModel(
                notification_id=doc["_id"],
                user_id=doc["user_id"],
                type=doc["type"],
                title=doc["title"],
                message=doc["message"],
                related_id=doc.get("related_id"),
                is_read=doc["is_read"],
                created_at=doc["created_at"]
            ))

        return notifications

    async def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read."""
        result = await self.notifications.update_one(
            {"_id": notification_id, "user_id": user_id},
            {"$set": {"is_read": True}}
        )
        return result.modified_count > 0

    async def get_notification_count(self, user_id: str) -> Dict[str, int]:
        """Get notification counts for a user."""
        total = await self.notifications.count_documents({"user_id": user_id})
        unread = await self.notifications.count_documents({"user_id": user_id, "is_read": False})

        return {"total": total, "unread": unread}

    async def update_answer(
        self, answer_id: str, answer_data: AnswerUpdateRequest, user_id: str
    ) -> Optional[AnswerModel]:
        """Update an answer (only by the author)."""
        answer_doc = await self.answers.find_one({"_id": answer_id, "author_id": user_id})
        if not answer_doc:
            return None

        update_fields = {
            "content": answer_data.content,
            "updated_at": datetime.now(timezone.utc)
        }

        if answer_data.images is not None:
            update_fields["images"] = answer_data.images

        await self.answers.update_one(
            {"_id": answer_id},
            {"$set": update_fields}
        )

        return await self._get_answer_by_id(answer_id)

    async def delete_answer(self, answer_id: str, user_id: str) -> bool:
        """Delete an answer (only by the author)."""
        answer_doc = await self.answers.find_one({"_id": answer_id, "author_id": user_id})
        if not answer_doc:
            return False

        question_id = answer_doc["question_id"]

        # Delete related data
        await self.votes.delete_many({"answer_id": answer_id})
        await self.comments.delete_many({"answer_id": answer_id})
        await self.notifications.delete_many({"related_id": answer_id})

        # Delete the answer
        result = await self.answers.delete_one({"_id": answer_id})

        if result.deleted_count > 0:
            # Update question answer count
            await self.questions.update_one(
                {"_id": question_id},
                {"$inc": {"answer_count": -1}}
            )
            return True

        return False

    async def remove_vote(self, answer_id: str, user_id: str) -> bool:
        """Remove a user's vote from an answer."""
        vote_doc = await self.votes.find_one({"answer_id": answer_id, "user_id": user_id})
        if not vote_doc:
            return False

        vote_type = vote_doc["vote_type"]

        # Remove the vote
        result = await self.votes.delete_one({"_id": vote_doc["_id"]})

        if result.deleted_count > 0:
            # Update answer vote counts
            update_fields = {"vote_count": -1}
            if vote_type == VoteType.UPVOTE:
                update_fields["upvotes"] = -1
            else:
                update_fields["downvotes"] = -1

            await self.answers.update_one(
                {"_id": answer_id},
                {"$inc": update_fields}
            )
            return True

        return False

    async def create_comment(self, answer_id: str, comment_data: CommentCreateRequest, author_id: str, author_name: str, author_email: str) -> Optional[CommentModel]:
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
            "created_at": datetime.now(timezone.utc)
        }

        await self.comments.insert_one(comment_doc)

        # Create notification for answer author
        if answer_doc["author_id"] != author_id:
            await self._create_notification(
                user_id=answer_doc["author_id"],
                notification_type=NotificationType.ANSWER_COMMENTED,
                title="New comment on your answer",
                message=f"{author_name} commented on your answer",
                related_id=answer_id
            )

        # Return the comment
        author = QuestionAuthorModel(
            user_id=author_id,
            name=author_name,
            email=author_email
        )

        return CommentModel(
            comment_id=comment_id,
            answer_id=answer_id,
            author=author,
            content=comment_data.content,
            created_at=datetime.now(timezone.utc)
        )

    async def delete_comment(self, comment_id: str, user_id: str) -> bool:
        """Delete a comment (only by the author)."""
        comment_doc = await self.comments.find_one({"_id": comment_id, "author_id": user_id})
        if not comment_doc:
            return False

        result = await self.comments.delete_one({"_id": comment_id})
        return result.deleted_count > 0

    async def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        result = await self.notifications.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}}
        )
        return result.modified_count

    # Helper methods
    async def _get_user_info(self, user_id: str) -> Optional[QuestionAuthorModel]:
        """Get user information from users collection."""
        user_collection = self.db.get_collection("users")
        user = await user_collection.find_one({"_id": user_id})

        if user:
            return QuestionAuthorModel(
                user_id=user["_id"],
                name=user["name"],
                email=user["email"]
            )
        return None

    async def _get_question_answers(self, question_id: str) -> List[AnswerModel]:
        """Get all answers for a question."""
        cursor = self.answers.find({"question_id": question_id}).sort("created_at", 1)
        answer_docs = await cursor.to_list(length=None)

        answers = []
        for doc in answer_docs:
            answer = await self._get_answer_by_id(doc["_id"])
            if answer:
                answers.append(answer)

        return answers

    async def _get_answer_by_id(self, answer_id: str) -> Optional[AnswerModel]:
        """Get an answer by ID with comments."""
        answer_doc = await self.answers.find_one({"_id": answer_id})
        if not answer_doc:
            return None

        author = await self._get_user_info(answer_doc["author_id"])
        if not author:
            return None

        # Get comments
        comments = await self._get_answer_comments(answer_id)

        return AnswerModel(
            answer_id=answer_doc["_id"],
            question_id=answer_doc["question_id"],
            author=author,
            content=answer_doc["content"],
            images=answer_doc.get("images", []),
            is_accepted=answer_doc["is_accepted"],
            vote_count=answer_doc["vote_count"],
            upvotes=answer_doc["upvotes"],
            downvotes=answer_doc["downvotes"],
            comments=comments,
            created_at=answer_doc["created_at"],
            updated_at=answer_doc.get("updated_at"),
        )

    async def _get_answer_comments(self, answer_id: str) -> List[CommentModel]:
        """Get comments for an answer."""
        cursor = self.comments.find({"answer_id": answer_id}).sort("created_at", 1)
        comment_docs = await cursor.to_list(length=None)

        comments = []
        for doc in comment_docs:
            author = await self._get_user_info(doc["author_id"])
            if author:
                comments.append(CommentModel(
                    comment_id=doc["_id"],
                    answer_id=doc["answer_id"],
                    author=author,
                    content=doc["content"],
                    created_at=doc["created_at"],
                    updated_at=doc.get("updated_at")
                ))

        return comments

    async def _create_notification(self, user_id: str, notification_type: NotificationType, title: str, message: str, related_id: Optional[str] = None):
        """Create a notification."""
        notification_id = str(uuid.uuid4())
        notification_doc = {
            "_id": notification_id,
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "related_id": related_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }

        await self.notifications.insert_one(notification_doc)

    async def _update_tag_stats(self, tags: List[str]):
        """Update tag statistics."""
        for tag in tags:
            await self.tags.update_one(
                {"name": tag},
                {
                    "$inc": {"count": 1},
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                },
                upsert=True
            )

    async def _increment_user_stat(self, user_id: str, field: str, amount: int = 1):
        """Increment a user statistic."""
        await self.user_stats.update_one(
            {"user_id": user_id},
            {"$inc": {field: amount}},
            upsert=True
        )


# Global service instance
qa_service = QAService()
