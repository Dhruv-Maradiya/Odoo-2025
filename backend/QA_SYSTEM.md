# Q&A System Backend

This is a comprehensive Q&A system backend built with FastAPI, similar to Stack Overflow. It supports rich text editing, voting, comments, notifications, and more.

## Features Implemented

### ✅ Core Q&A Functionality
- **Questions**: Create, read, update, delete questions with rich text support
- **Answers**: Create, read, update, delete answers to questions
- **Voting**: Upvote/downvote answers with vote removal capability
- **Comments**: Add comments to answers
- **Answer Acceptance**: Question authors can accept answers
- **Rich Text Support**: Questions and answers support rich text formatting (bold, italic, lists, hyperlinks, etc.)

### ✅ Search & Filtering
- **Question Search**: Search questions by text, tags, author, and acceptance status
- **Pagination**: Paginated results with configurable page size
- **Sorting**: Sort by creation date, update date, view count, answer count

### ✅ Tagging System
- **Multi-tag Support**: Questions require 1-10 tags
- **Tag Filtering**: Filter questions by specific tags
- **Tag Statistics**: Track tag usage and activity

### ✅ Notification System
- **Real-time Notifications**: Users get notified for:
  - New answers to their questions
  - Comments on their answers
  - Answer acceptance
  - User mentions (future enhancement)
- **Notification Management**: Mark as read, get unread count
- **Notification Types**: Structured notification system with different types

### ✅ Authentication & Authorization
- **User Authentication**: Custom token-based authentication system
- **Authorization**: Only logged-in users can post/answer/vote
- **User Permissions**: Authors can only edit their own content

### ✅ User Statistics
- **Question Stats**: Track questions asked, answers given, accepted answers
- **Reputation System**: Vote-based reputation scoring
- **Activity Tracking**: Monitor user engagement

## API Endpoints

### Questions
- `POST /api/v1/qa/questions` - Create a new question
- `GET /api/v1/qa/questions` - Search questions with filters
- `GET /api/v1/qa/questions/{question_id}` - Get question details
- `PUT /api/v1/qa/questions/{question_id}` - Update question (author only)
- `DELETE /api/v1/qa/questions/{question_id}` - Delete question (author only)

### Answers
- `POST /api/v1/qa/questions/{question_id}/answers` - Create an answer
- `PUT /api/v1/qa/answers/{answer_id}` - Update answer (author only)
- `DELETE /api/v1/qa/answers/{answer_id}` - Delete answer (author only)

### Voting
- `POST /api/v1/qa/answers/{answer_id}/vote` - Vote on an answer
- `DELETE /api/v1/qa/answers/{answer_id}/vote` - Remove vote

### Answer Acceptance
- `POST /api/v1/qa/questions/{question_id}/answers/{answer_id}/accept` - Accept answer (question author only)

### Comments
- `POST /api/v1/qa/answers/{answer_id}/comments` - Add comment to answer
- `DELETE /api/v1/qa/comments/{comment_id}` - Delete comment (author only)

### Notifications
- `GET /api/v1/qa/notifications` - Get user notifications
- `GET /api/v1/qa/notifications/count` - Get notification count
- `POST /api/v1/qa/notifications/{notification_id}/read` - Mark notification as read
- `POST /api/v1/qa/notifications/read-all` - Mark all notifications as read

## Rich Text Features Supported

The system supports rich text content with the following features:
- **Text Formatting**: Bold, italic, underline
- **Lists**: Ordered and unordered lists
- **Links**: Hyperlinks with custom text
- **Text Alignment**: Left, center, right alignment
- **Emoji Support**: Emoji in questions and answers
- **Image Upload**: Support for image attachments (backend ready)

## Data Models

### Question Model
```json
{
  "question_id": "string",
  "author": {
    "user_id": "string",
    "name": "string",
    "email": "string"
  },
  "title": "string",
  "description": "rich text content",
  "tags": ["tag1", "tag2"],
  "view_count": 0,
  "answer_count": 0,
  "has_accepted_answer": false,
  "answers": [],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Answer Model
```json
{
  "answer_id": "string",
  "question_id": "string",
  "author": {
    "user_id": "string",
    "name": "string", 
    "email": "string"
  },
  "content": "rich text content",
  "is_accepted": false,
  "vote_count": 0,
  "upvotes": 0,
  "downvotes": 0,
  "comments": [],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Database Collections

The system uses MongoDB with the following collections:
- `questions` - Store questions with metadata
- `answers` - Store answers linked to questions
- `votes` - Track user votes on answers
- `comments` - Store comments on answers
- `notifications` - User notification system
- `tags` - Tag metadata and statistics
- `user_stats` - User activity and reputation data

## Authentication

The system uses a custom token-based authentication system:
- **Token Generation**: HMAC-signed base64 tokens
- **User Context**: Current user information available in all protected endpoints
- **Authorization**: Role-based access control

## Technology Stack

- **Framework**: FastAPI with Python 3.11+
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: Custom token-based system
- **Validation**: Pydantic models with comprehensive validation
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

## Installation & Setup

1. Install dependencies:
```bash
cd fastapi_backend
pip install -r requirements.txt  # or use uv/poetry
```

2. Configure environment variables:
- Set `MONGO_DB` connection string
- Configure JWT secret key

3. Run the application:
```bash
uvicorn app.main:app --reload
```

4. Access API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Usage Examples

### Create a Question
```bash
POST /api/v1/qa/questions
Authorization: Bearer <token>

{
  "title": "How to implement async/await in Python?",
  "description": "<p>I'm learning about <strong>asynchronous programming</strong> in Python...</p>",
  "tags": ["python", "async", "programming"]
}
```

### Search Questions
```bash
GET /api/v1/qa/questions?query=python&tags=async&sort_by=created_at&order=desc&page=1&limit=20
```

### Vote on Answer
```bash
POST /api/v1/qa/answers/{answer_id}/vote
Authorization: Bearer <token>

{
  "vote_type": "upvote"
}
```

## Future Enhancements

- **User Mentions**: @username mentions in comments/answers
- **File Attachments**: Support for file uploads and attachments
- **Advanced Search**: Full-text search with elasticsearch
- **Real-time Updates**: WebSocket support for live notifications
- **Moderation**: Content moderation and reporting system
- **Badges**: Achievement system with badges

This Q&A system provides a solid foundation for building a comprehensive question-and-answer platform with modern features and best practices.
