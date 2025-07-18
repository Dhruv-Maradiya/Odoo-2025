# Q&A System with Semantic Search

A comprehensive FastAPI backend for a Q&A platform with semantic search capabilities using ChromaDB.

## Features

- **Google OAuth Authentication** - Secure login with Google accounts
- **Q&A System** - Complete question and answer platform
- **Semantic Search** - AI-powered search using ChromaDB vector embeddings
- **Image Upload** - Support for images in questions and answers
- **Voting System** - Upvote/downvote answers
- **Notifications** - Real-time notifications for Q&A activities
- **User Management** - User profiles and statistics
- **Post Save/Bookmark Feature** - Save questions and answers for later reference

## Core Components

- MongoDB for primary data storage
- ChromaDB for semantic search and vector embeddings
- Redis for session caching
- JWT-based authentication

## API Endpoints

### Authentication

- `GET /api/v1/oauth/login/google` - Initiate Google OAuth login
- `GET /api/v1/oauth/google/callback` - Handle OAuth callback
- `POST /api/v1/oauth/logout` - Logout user

### Q&A System

- `POST /api/v1/qa/questions` - Create a new question
- `GET /api/v1/qa/questions/search` - Search questions (with semantic search)
- `GET /api/v1/qa/questions/{id}` - Get question details
- `PUT /api/v1/qa/questions/{id}` - Update question
- `DELETE /api/v1/qa/questions/{id}` - Delete question
- `POST /api/v1/qa/questions/{id}/answers` - Create an answer
- `POST /api/v1/qa/answers/{id}/vote` - Vote on an answer

### Semantic Search

- `GET /api/v1/qa/questions/{id}/similar` - Get similar questions
- `GET /api/v1/qa/search/semantic` - Semantic search across all content
- `GET /api/v1/qa/chromadb/stats` - ChromaDB statistics

### Images

- `POST /api/v1/images/upload` - Upload images
- `GET /api/v1/images/{filename}` - Get uploaded images

### Notifications

- `GET /api/v1/notifications` - Get user notifications
- `POST /api/v1/notifications/{id}/read` - Mark notification as read

### Saved Posts

- `POST /api/v1/saved-posts/save` - Save a question or answer
- `GET /api/v1/saved-posts` - Get saved posts
- `PUT /api/v1/saved-posts/{saved_id}` - Update saved post notes
- `DELETE /api/v1/saved-posts/unsave/{post_id}` - Remove saved post
- `GET /api/v1/saved-posts/check/{post_id}` - Check if post is saved
- `GET /api/v1/saved-posts/stats` - Get saved posts statistics

## Environment Variables

The following environment variables are required:

```bash
# Database
MONGO_DB=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
CHROMADB_HOST=http://chromadb:8000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Application
ENV=production
HOST=https://your-api-domain.com
FRONTEND_URL=https://your-frontend-domain.com

FROM_EMAIL=noreply@example.com
```

## Getting Started with Docker

1. Clone the repository and navigate to the backend directory

2. Create a `.env` file with the required environment variables

3. Start all services using Docker Compose:

   ```bash
   docker-compose up -d
   ```

   This will start:

   - FastAPI backend (port 8000)
   - MongoDB (port 27017)
   - Redis (port 6379)
   - ChromaDB (port 8002)
   - Mongo Express (port 8081, dev profile only)

4. The API will be available at `http://localhost:8000` with documentation at `/docs`

## Development Setup

1. Install dependencies:

   ```bash
   uv install
   ```

2. Start the development services:

   ```bash
   docker-compose up mongo redis chromadb -d
   ```

3. Run the FastAPI application:
   ```bash
   uvicorn app.main:app --reload
   ```

## Semantic Search Features

The application includes powerful semantic search capabilities:

- **Question Similarity**: Find questions similar to a given question
- **Cross-content Search**: Search across both questions and answers
- **Tag-based Filtering**: Combine semantic search with tag filters
- **Vector Embeddings**: Uses ChromaDB for efficient semantic similarity

### Example Semantic Search Usage

```python
# Get similar questions
GET /api/v1/qa/questions/{question_id}/similar?limit=5

# Search all content semantically
GET /api/v1/qa/search/semantic?query=python async programming&limit=20
```

## Post Save/Bookmark Feature

Users can save questions and answers for later reference:

- **Save Posts**: Save questions or answers with optional notes
- **Manage Saved Posts**: Update notes, remove saved posts
- **List Saved Posts**: Get paginated list of saved posts with full content
- **Statistics**: View saved posts statistics
- **Check Status**: Check if a specific post is already saved

### Saved Posts API Endpoints

```python
# Save a post
POST /api/v1/saved-posts/save
{
    "post_id": "question_or_answer_id",
    "post_type": "question|answer",
    "notes": "Optional user notes"
}

# Get saved posts
GET /api/v1/saved-posts?post_type=question&page=1&limit=20

# Update saved post notes
PUT /api/v1/saved-posts/{saved_id}
{
    "notes": "Updated notes"
}

# Remove saved post
DELETE /api/v1/saved-posts/unsave/{post_id}?post_type=question

# Check if post is saved
GET /api/v1/saved-posts/check/{post_id}?post_type=question

# Get saved posts statistics
GET /api/v1/saved-posts/stats
```
