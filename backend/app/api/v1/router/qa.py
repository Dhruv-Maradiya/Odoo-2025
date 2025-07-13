"""
Q&A API endpoints for questions, answers, voting, and notifications.
"""

from typing import List, Optional

from app.api.v1.dependencies import get_optional_user, require_role
from app.models.qa_models import (
    AnswerCreateRequest,
    AnswerModel,
    AnswerUpdateRequest,
    BulkDeleteRequest,
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
from app.models.user_models import CurrentUserModel, UserRole
from app.services.qa_service import QAService
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter()

# Initialize service
qa_service = QAService()


@router.post(
    "/questions", response_model=QuestionModel, status_code=status.HTTP_201_CREATED
)
async def create_question(
    question_data: QuestionCreateRequest,
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
) -> QuestionModel:
    """Create a new question."""

    try:
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

    except Exception as e:
        print("this is the error man", e)
        raise


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
    current_user: Optional[CurrentUserModel] = Depends(get_optional_user),
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

    return await qa_service.search_questions(
        search_request, user_id=current_user.user_id if current_user else None
    )


@router.get("/questions/{question_id}", response_model=QuestionModel)
async def get_question(
    question_id: str,
    increment_view: bool = Query(False, description="Increment view count"),
    current_user: Optional[CurrentUserModel] = Depends(get_optional_user),
) -> QuestionModel:
    """Get a question by ID."""
    user_id = current_user.user_id if current_user else None
    question = await qa_service.get_question_by_id(
        question_id, increment_view=increment_view, user_id=user_id
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
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
    question_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
) -> AnswerModel:
    """Create an answer to a question."""
    answer = await qa_service.create_answer(
        question_id=question_id,
        answer_data=answer_data,
        author_id=current_user.user_id,
        author_name=current_user.name,
        author_email=current_user.email,
        author_picture=current_user.picture,
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
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
    answer_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
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
    answer_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
) -> CommentModel:
    """Create a comment on an answer."""
    comment = await qa_service.create_comment(
        answer_id=answer_id,
        comment_data=comment_data,
        author_id=current_user.user_id,
        author_name=current_user.name,
        author_email=current_user.email,
        author_picture=current_user.picture,
    )

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found"
        )

    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
) -> NotificationCountModel:
    """Get notification count for the current user."""
    count_dict = await qa_service.get_notification_count(current_user.user_id)

    # Convert dict to NotificationCountModel
    return NotificationCountModel(
        total=count_dict.get("total", 0), unread=count_dict.get("unread", 0)
    )


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
):
    """Mark all notifications as read for the current user."""
    count = await qa_service.mark_all_notifications_read(current_user.user_id)

    return {"message": f"Marked {count} notifications as read"}


@router.get("/questions/{question_id}/similar")
async def get_similar_questions(
    question_id: str,
    limit: int = Query(
        5, ge=1, le=20, description="Number of similar questions to retrieve"
    ),
):
    """Get questions similar to the given question using semantic search."""
    similar_questions = await qa_service.get_similar_questions(question_id, limit)
    return {"similar_questions": similar_questions}


@router.get("/search/semantic")
async def semantic_search(
    query: str = Query(..., description="Search query for semantic search"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
):
    """Perform semantic search across questions and answers."""
    results = await qa_service.semantic_search_all(query, limit)
    return results


# Admin-only endpoints
@router.get("/admin/questions", response_model=QuestionSearchResponse)
async def admin_search_questions(
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
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
) -> QuestionSearchResponse:
    """Admin endpoint to search and manage questions."""
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

    return await qa_service.search_questions(
        search_request, user_id=current_user.user_id if current_user else None
    )


@router.delete("/admin/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_question(
    question_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Admin endpoint to delete any question."""
    success = await qa_service.admin_delete_question(question_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    return {"message": f"Question {question_id} deleted by admin {current_user.email}"}


@router.delete("/admin/answers/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_answer(
    answer_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Admin endpoint to delete any answer."""
    success = await qa_service.admin_delete_answer(answer_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found",
        )

    return {"message": f"Answer {answer_id} deleted by admin {current_user.email}"}





@router.get("/admin/questions/{question_id}/full", response_model=QuestionModel)
async def admin_get_question_full(
    question_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
) -> QuestionModel:
    """Admin endpoint to get full question details including deleted items."""
    question = await qa_service.get_question_by_id(question_id, increment_view=False)

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Question not found"
        )

    return question


@router.get("/admin/stats")
async def admin_get_stats(
    date_from: Optional[str] = Query(
        None, description="Start date for stats (YYYY-MM-DD)"
    ),
    date_to: Optional[str] = Query(None, description="End date for stats (YYYY-MM-DD)"),
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Admin endpoint to get comprehensive platform statistics."""
    from datetime import datetime

    # Parse date parameters if provided
    date_from_obj = None
    date_to_obj = None

    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD"
            )

    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD"
            )

    stats = await qa_service.admin_get_platform_stats(date_from_obj, date_to_obj)
    stats["generated_by"] = current_user.email
    stats["date_range"] = {"from": date_from, "to": date_to}

    return stats


@router.get("/admin/users/{user_id}/posts")
async def admin_get_user_posts(
    user_id: str,
    post_type: Optional[str] = Query(
        None, description="Filter by post type: questions, answers, comments"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Admin endpoint to get all posts by a specific user."""
    # This would need to be implemented in the QA service
    return {
        "user_id": user_id,
        "post_type": post_type,
        "page": page,
        "limit": limit,
        "message": "Get user posts endpoint - implement in QA service",
    }


@router.post("/admin/bulk-delete")
async def admin_bulk_delete(
    request: BulkDeleteRequest,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Admin endpoint for bulk deletion of content."""
    item_ids = request.item_ids
    item_type = request.item_type

    if item_type == "questions":
        # For now, handle questions individually since bulk method doesn't exist
        deleted_count = 0
        failed_ids = []

        for question_id in item_ids:
            try:
                success = await qa_service.admin_delete_question(question_id)
                if success:
                    deleted_count += 1
                else:
                    failed_ids.append(question_id)
            except Exception:
                failed_ids.append(question_id)

        result = {
            "total_requested": len(item_ids),
            "deleted_count": deleted_count,
            "failed_count": len(failed_ids),
            "failed_ids": failed_ids,
        }
    else:
        # For now, handle other types individually
        deleted_count = 0
        failed_ids = []

        for item_id in item_ids:
            try:
                if item_type == "answers":
                    success = await qa_service.admin_delete_answer(item_id)
                elif item_type == "comments":
                    success = await qa_service.admin_delete_comment(item_id)
                else:
                    failed_ids.append(item_id)
                    continue

                if success:
                    deleted_count += 1
                else:
                    failed_ids.append(item_id)
            except Exception:
                failed_ids.append(item_id)

        result = {
            "total_requested": len(item_ids),
            "deleted_count": deleted_count,
            "failed_count": len(failed_ids),
            "failed_ids": failed_ids,
        }

    result["bulk_deleted_by"] = current_user.email
    result["item_type"] = item_type

    return result


@router.get("/admin/users")
async def admin_get_users(
    role: Optional[str] = Query(
        None, description="Filter by user role: guest, user, admin"
    ),
    search: Optional[str] = Query(None, description="Search users by name or email"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Admin endpoint to get all users with filtering options."""
    # This would need to be implemented in the user service
    return {
        "role": role,
        "search": search,
        "page": page,
        "limit": limit,
        "message": "Get users endpoint - implement in user service",
    }


@router.put("/admin/users/{user_id}/role")
async def admin_update_user_role(
    user_id: str,
    new_role: UserRole = Query(..., description="New role for the user"),
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Admin endpoint to update a user's role."""
    # This would need to be implemented in the user service
    # Prevent admins from changing their own role to prevent lockout
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    return {
        "user_id": user_id,
        "new_role": new_role.value,
        "updated_by": current_user.email,
        "message": "User role update endpoint - implement in user service",
    }


@router.post("/admin/users/{user_id}/suspend")
async def admin_suspend_user(
    user_id: str,
    reason: str = Query(..., description="Reason for suspension"),
    duration_days: int = Query(
        7, ge=1, le=365, description="Suspension duration in days"
    ),
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Admin endpoint to suspend a user account."""
    # This would need to be implemented in the user service
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend your own account",
        )

    return {
        "user_id": user_id,
        "reason": reason,
        "duration_days": duration_days,
        "suspended_by": current_user.email,
        "message": "User suspension endpoint - implement in user service",
    }


@router.post("/questions/{question_id}/vote", status_code=status.HTTP_201_CREATED)
async def vote_question(
    question_id: str,
    vote_data: VoteRequest,
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
):
    """Vote on a question (upvote or downvote)."""
    question = await qa_service.vote_question(
        question_id=question_id, vote_data=vote_data, user_id=current_user.user_id
    )

    print(f"{question=}")

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Question not found"
        )

    return {
        "message": "Vote recorded successfully",
        "vote_count": question.vote_count,
        "upvotes": getattr(question, "upvotes", None),
        "downvotes": getattr(question, "downvotes", None),
        "user_vote": vote_data.vote_type,
    }
