"""
Q&A system models for questions, answers, votes, and notifications.
"""

from datetime import datetime
from enum import Enum
from operator import ge
from typing import List, Optional

from pydantic import BaseModel, Field, validator


class VoteType(str, Enum):
    """Vote types for answers."""

    UPVOTE = "upvote"
    DOWNVOTE = "downvote"


class NotificationType(str, Enum):
    """Types of notifications."""

    QUESTION_ANSWERED = "question_answered"
    ANSWER_COMMENTED = "answer_commented"
    USER_MENTIONED = "user_mentioned"
    ANSWER_ACCEPTED = "answer_accepted"


class TextAlignment(str, Enum):
    """Text alignment options for rich text."""

    LEFT = "left"
    CENTER = "center"
    RIGHT = "right"


# Request Models
class BulkDeleteRequest(BaseModel):
    """Request model for bulk deletion of content."""

    item_ids: List[str] = Field(..., description="List of item IDs to delete")
    item_type: str = Field(
        ..., description="Type of items: questions, answers, comments"
    )

    @validator("item_type")
    def validate_item_type(cls, v):
        if v not in ["questions", "answers", "comments"]:
            raise ValueError("item_type must be one of: questions, answers, comments")
        return v

    @validator("item_ids")
    def validate_item_ids(cls, v):
        if not v:
            raise ValueError("item_ids cannot be empty")
        return v


class FlagContentRequest(BaseModel):
    """Request model for flagging content."""

    reason: str = Field(
        ..., min_length=3, max_length=500, description="Reason for flagging"
    )


class QuestionCreateRequest(BaseModel):
    """Request model for creating a new question."""

    title: str = Field(min_length=5, max_length=200, description="Question title")
    description: str = Field(min_length=10, description="Rich text description")
    tags: List[str] = Field(description="Question tags")
    images: Optional[List[str]] = Field(None, description="List of image URLs")

    @validator("tags")
    def validate_tags(cls, v):
        if len(v) < 1 or len(v) > 10:
            raise ValueError("Must have between 1 and 10 tags")
        return v


class QuestionUpdateRequest(BaseModel):
    """Request model for updating a question."""

    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = Field(None, description="List of image URLs")

    @validator("tags")
    def validate_tags(cls, v):
        if v is not None and (len(v) < 1 or len(v) > 10):
            raise ValueError("Must have between 1 and 10 tags")
        return v


class AnswerCreateRequest(BaseModel):
    """Request model for creating an answer."""

    content: str = Field(..., min_length=10, description="Rich text answer content")
    images: Optional[List[str]] = Field(None, description="List of image URLs")


class AnswerUpdateRequest(BaseModel):
    """Request model for updating an answer."""

    content: str = Field(..., min_length=10, description="Rich text answer content")
    images: Optional[List[str]] = Field(None, description="List of image URLs")


class VoteRequest(BaseModel):
    """Request model for voting on an answer."""

    vote_type: VoteType


class CommentCreateRequest(BaseModel):
    """Request model for creating a comment on an answer."""

    content: str = Field(..., min_length=1, max_length=500, description="Comment text")


# Response Models
class TagModel(BaseModel):
    """Tag model."""

    name: str
    count: int = 0
    description: Optional[str] = None


class QuestionAuthorModel(BaseModel):
    """Question/Answer author model."""

    user_id: str
    name: str
    email: str
    picture: str | None


class VoteModel(BaseModel):
    """Vote model."""

    vote_id: str
    user_id: str
    answer_id: str
    vote_type: VoteType
    created_at: datetime


class CommentModel(BaseModel):
    """Comment model."""

    comment_id: str
    answer_id: str
    author: QuestionAuthorModel
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class AnswerModel(BaseModel):
    """Answer model."""

    answer_id: str
    question_id: str
    author: QuestionAuthorModel
    content: str
    images: Optional[List[str]] = None
    is_accepted: bool = False
    vote_count: int = 0
    upvotes: int = 0
    downvotes: int = 0
    user_vote: Optional[str] = None
    comments: List[CommentModel] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class QuestionModel(BaseModel):
    """Question model."""

    question_id: str
    author: QuestionAuthorModel
    title: str
    description: str
    tags: List[str]
    images: Optional[List[str]] = None
    view_count: int = 0
    vote_count: int = 0
    answer_count: int = 0
    has_accepted_answer: bool = False
    is_flagged: bool = False
    user_vote: Optional[str] = None
    answers: List[AnswerModel] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class QuestionListModel(BaseModel):
    """Simplified question model for listing."""

    question_id: str
    author: QuestionAuthorModel
    title: str
    tags: List[str]
    view_count: int = 0
    answer_count: int = 0
    vote_count: int = 0
    has_accepted_answer: bool = False
    is_flagged: bool = False
    user_vote: Optional[str] = None
    created_at: datetime


class NotificationModel(BaseModel):
    """Notification model."""

    notification_id: str
    user_id: str
    type: NotificationType
    title: str
    message: str
    related_id: Optional[str] = None  # question_id, answer_id, etc.
    is_read: bool = False
    created_at: datetime


class NotificationCountModel(BaseModel):
    """Notification count model."""

    total: int
    unread: int


# Search and Filter Models
class QuestionSearchRequest(BaseModel):
    """Request model for searching questions."""

    query: Optional[str] = None
    tags: Optional[List[str]] = None
    author_id: Optional[str] = None
    has_accepted_answer: Optional[bool] = None
    sort_by: Optional[str] = "created_at"
    vote_count: int = 0
    order: Optional[str] = "desc"
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    answer_count:int =Field(default=0,ge=0,description="Number of answers (comments)")

    @validator("sort_by")
    def validate_sort_by(cls, v):
        if v not in ["created_at", "updated_at", "view_count", "answer_count"]:
            raise ValueError(
                "sort_by must be one of: created_at, updated_at, view_count, answer_count"
            )
        return v

    @validator("order")
    def validate_order(cls, v):
        if v not in ["asc", "desc"]:
            raise ValueError("order must be either asc or desc")
        return v


class QuestionSearchResponse(BaseModel):
    """Response model for question search."""

    questions: List[QuestionListModel]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool


# Statistics Models
class UserStatsModel(BaseModel):
    """User statistics model."""

    user_id: str
    questions_asked: int = 0
    answers_given: int = 0
    accepted_answers: int = 0
    total_votes_received: int = 0
    reputation_score: int = 0


class TagStatsModel(BaseModel):
    """Tag statistics model."""

    name: str
    question_count: int
    total_views: int
    recent_activity: datetime
