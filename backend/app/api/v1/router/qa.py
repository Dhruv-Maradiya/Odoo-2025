"""
Q&A API endpoints for questions, answers, voting, and notifications.
"""

from typing import List, Optional

from app.api.v1.dependencies import get_current_user
from app.models.qa_models import (
    AnswerCreateRequest,
    AnswerModel,
    AnswerUpdateRequest,
    CommentCreateRequest,
    CommentModel,
    NotificationCountModel,
    NotificationModel,
    QuestionCreateRequest,
    QuestionModel,
    QuestionSearchRequest,
    QuestionSearchResponse,
    QuestionUpdateRequest,
    VoteRequest,
)
from app.models.user_models import CurrentUserModel
from app.services.qa_service import QAService
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer

router = APIRouter()
security = HTTPBearer()

# Initialize service
qa_service = QAService()


@router.post(
    "/questions", response_model=QuestionModel, status_code=status.HTTP_201_CREATED
)
async def create_question(
    question_data: QuestionCreateRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> QuestionModel:
    """Create a new question."""
    question = await qa_service.create_question(
        question_data=question_data,
        author_id=current_user.user_id,
        author_name=current_user.name,
        author_email=current_user.email,
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create question",
        )

    return question


@router.get("/questions", response_model=QuestionSearchResponse)
async def search_questions(
    query: Optional[str] = Query(None, description="Search query"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    author_id: Optional[str] = Query(None, description="Filter by author"),
    has_accepted_answer: Optional[bool] = Query(
        None, description="Filter by accepted answer status"
    ),
    sort_by: str = Query("created_at", description="Sort field"),
    order: str = Query("desc", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
) -> QuestionSearchResponse:
    """Search and filter questions."""
    search_request = QuestionSearchRequest(
        query=query,
        tags=tags,
        author_id=author_id,
        has_accepted_answer=has_accepted_answer,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )

    return await qa_service.search_questions(search_request)


@router.get("/questions/{question_id}", response_model=QuestionModel)
async def get_question(
    question_id: str,
    increment_view: bool = Query(False, description="Increment view count"),
) -> QuestionModel:
    """Get a question by ID."""
    question = await qa_service.get_question_by_id(
        question_id, increment_view=increment_view
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Question not found"
        )

    return question


@router.put("/questions/{question_id}", response_model=QuestionModel)
async def update_question(
    question_id: str,
    update_data: QuestionUpdateRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> QuestionModel:
    """Update a question (only by the author)."""
    question = await qa_service.update_question(
        question_id=question_id, update_data=update_data, user_id=current_user.user_id
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found or not authorized to update",
        )

    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: str, current_user: CurrentUserModel = Depends(get_current_user)
):
    """Delete a question (only by the author)."""
    success = await qa_service.delete_question(question_id, current_user.user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found or not authorized to delete",
        )


@router.post(
    "/questions/{question_id}/answers",
    response_model=AnswerModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_answer(
    question_id: str,
    answer_data: AnswerCreateRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> AnswerModel:
    """Create an answer to a question."""
    answer = await qa_service.create_answer(
        question_id=question_id,
        answer_data=answer_data,
        author_id=current_user.user_id,
        author_name=current_user.name,
        author_email=current_user.email,
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Question not found"
        )

    return answer


@router.put("/answers/{answer_id}", response_model=AnswerModel)
async def update_answer(
    answer_id: str,
    answer_data: AnswerUpdateRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> AnswerModel:
    """Update an answer (only by the author)."""
    answer = await qa_service.update_answer(
        answer_id=answer_id, answer_data=answer_data, user_id=current_user.user_id
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found or not authorized to update",
        )

    return answer


@router.delete("/answers/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_answer(
    answer_id: str, current_user: CurrentUserModel = Depends(get_current_user)
):
    """Delete an answer (only by the author)."""
    success = await qa_service.delete_answer(answer_id, current_user.user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found or not authorized to delete",
        )


@router.post("/answers/{answer_id}/vote", status_code=status.HTTP_201_CREATED)
async def vote_answer(
    answer_id: str,
    vote_data: VoteRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
):
    """Vote on an answer (upvote or downvote)."""
    # The service method signature is: vote_answer(answer_id, vote_data, user_id)
    answer = await qa_service.vote_answer(
        answer_id=answer_id, vote_data=vote_data, user_id=current_user.user_id
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found"
        )

    return {"message": "Vote recorded successfully"}


@router.delete("/answers/{answer_id}/vote", status_code=status.HTTP_204_NO_CONTENT)
async def remove_vote(
    answer_id: str, current_user: CurrentUserModel = Depends(get_current_user)
):
    """Remove a vote from an answer."""
    success = await qa_service.remove_vote(answer_id, current_user.user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Vote not found"
        )


@router.post(
    "/questions/{question_id}/answers/{answer_id}/accept",
    status_code=status.HTTP_200_OK,
)
async def accept_answer(
    question_id: str,
    answer_id: str,
    current_user: CurrentUserModel = Depends(get_current_user),
):
    """Accept an answer (only by the question author)."""
    success = await qa_service.accept_answer(
        question_id, answer_id, current_user.user_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found or not authorized to accept",
        )

    return {"message": "Answer accepted successfully"}


@router.post(
    "/answers/{answer_id}/comments",
    response_model=CommentModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    answer_id: str,
    comment_data: CommentCreateRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> CommentModel:
    """Create a comment on an answer."""
    comment = await qa_service.create_comment(
        answer_id=answer_id,
        comment_data=comment_data,
        author_id=current_user.user_id,
        author_name=current_user.name,
        author_email=current_user.email,
    )

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found"
        )

    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str, current_user: CurrentUserModel = Depends(get_current_user)
):
    """Delete a comment (only by the author)."""
    success = await qa_service.delete_comment(comment_id, current_user.user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or not authorized to delete",
        )


# Notification endpoints
@router.get("/notifications", response_model=List[NotificationModel])
async def get_notifications(
    current_user: CurrentUserModel = Depends(get_current_user),
    limit: int = Query(
        20, ge=1, le=100, description="Number of notifications to retrieve"
    ),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
) -> List[NotificationModel]:
    """Get notifications for the current user."""
    return await qa_service.get_user_notifications(
        user_id=current_user.user_id, limit=limit, offset=offset
    )


@router.get("/notifications/count", response_model=NotificationCountModel)
async def get_notification_count(
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationCountModel:
    """Get notification count for the current user."""
    count_dict = await qa_service.get_notification_count(current_user.user_id)

    # Convert dict to NotificationCountModel
    return NotificationCountModel(
        total=count_dict.get("total", 0), unread=count_dict.get("unread", 0)
    )


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: str, current_user: CurrentUserModel = Depends(get_current_user)
):
    """Mark a notification as read."""
    success = await qa_service.mark_notification_read(
        notification_id, current_user.user_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    return {"message": "Notification marked as read"}


@router.post("/notifications/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    current_user: CurrentUserModel = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    count = await qa_service.mark_all_notifications_read(current_user.user_id)

    return {"message": f"Marked {count} notifications as read"}
