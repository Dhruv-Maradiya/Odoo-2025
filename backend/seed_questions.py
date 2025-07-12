#!/usr/bin/env python3
"""
Script to seed the database with random programming questions.
This script creates realistic programming questions with titles, descriptions, and tags.
"""

import asyncio
import os
import sys
import random
from datetime import datetime, timezone
from typing import List, Dict

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

# Override environment variables for local execution
os.environ["CHROMADB_HOST"] = "http://localhost:8000"
os.environ["MONGO_DB"] = "mongodb://localhost:27017"

from app.db.mongodb.mongodb import init_mongodb
from app.services.qa_service import QAService
from app.services.user_service import get_user_by_id
from app.models.qa_models import QuestionCreateRequest

# Sample programming questions data
PROGRAMMING_QUESTIONS = [
    {
        "title": "React vs Vue.js: Which framework should I choose for a new project in 2025?",
        "description": """<p>I'm starting a new web application project and I'm torn between React and Vue.js. I have experience with both, but I want to make the best choice for a long-term project.</p>

<p><strong>My requirements:</strong></p>
<ul>
<li>Scalable architecture for a team of 5-10 developers</li>
<li>Good TypeScript support</li>
<li>Rich ecosystem of libraries and tools</li>
<li>Strong community and job market</li>
<li>Performance for complex UIs</li>
</ul>

<p>I've heard Vue 3 has made significant improvements, but React's ecosystem is still massive. What are your thoughts on the current state of both frameworks in 2025?</p>""",
        "tags": ["react", "vue", "javascript", "frontend", "typescript"]
    },
    {
        "title": "How to implement proper error handling in a microservices architecture?",
        "description": """<p>I'm building a microservices-based application and struggling with error handling patterns. We have 8 services communicating via REST APIs and message queues.</p>

<p><strong>Current challenges:</strong></p>
<ul>
<li>Errors propagating across service boundaries</li>
<li>Inconsistent error responses</li>
<li>Difficult debugging when errors occur in downstream services</li>
<li>Handling partial failures in distributed transactions</li>
</ul>

<p>I've looked into circuit breakers, retry mechanisms, and distributed tracing, but I'm not sure about the best practices for 2025. What patterns have you found most effective?</p>""",
        "tags": ["microservices", "error-handling", "distributed-systems", "architecture"]
    },
    {
        "title": "Python async/await vs threading: When to use each for I/O-bound operations?",
        "description": """<p>I'm working on a Python application that needs to handle multiple I/O operations (database queries, API calls, file operations). I'm confused about when to use async/await vs threading.</p>

<p><strong>My use case:</strong></p>
<ul>
<li>Processing 1000+ database records</li>
<li>Making API calls to external services</li>
<li>File I/O operations</li>
<li>Need to maintain order for some operations</li>
</ul>

<p>I understand that async/await is great for I/O-bound tasks, but what about when you have CPU-bound operations mixed in? Also, how do you handle blocking operations in an async context?</p>""",
        "tags": ["python", "async-await", "threading", "concurrency", "performance"]
    },
    {
        "title": "Docker containers vs Kubernetes pods: Understanding the differences and when to use each",
        "description": """<p>I'm learning about containerization and orchestration, but I'm confused about the relationship between Docker containers and Kubernetes pods.</p>

<p><strong>What I understand:</strong></p>
<ul>
<li>Docker containers are isolated environments for applications</li>
<li>Kubernetes pods can contain one or more containers</li>
<li>Pods are the smallest deployable units in Kubernetes</li>
</ul>

<p><strong>My questions:</strong></p>
<ul>
<li>When would you put multiple containers in a single pod?</li>
<li>What are the networking implications?</li>
<li>How do resource limits work differently?</li>
<li>Best practices for production deployments?</li>
</ul>""",
        "tags": ["docker", "kubernetes", "containers", "devops", "orchestration"]
    },
    {
        "title": "Machine Learning model deployment: MLOps best practices for 2025",
        "description": """<p>I've built several ML models and now need to deploy them to production. I'm overwhelmed by the MLOps landscape and need guidance on best practices.</p>

<p><strong>My requirements:</strong></p>
<ul>
<li>Model versioning and rollback capabilities</li>
<li>A/B testing for model performance</li>
<li>Monitoring model drift and performance</li>
<li>Scalable inference serving</li>
<li>Integration with existing CI/CD pipelines</li>
</ul>

<p>I've looked at tools like MLflow, Kubeflow, and SageMaker, but I'm not sure which approach to take. What's the current state of MLOps in 2025?</p>""",
        "tags": ["machine-learning", "mlops", "deployment", "ai", "production"]
    },
    {
        "title": "GraphQL vs REST API: Performance and complexity trade-offs",
        "description": """<p>I'm designing a new API for a mobile app and considering GraphQL vs REST. I need to understand the real-world trade-offs beyond the marketing hype.</p>

<p><strong>My concerns:</strong></p>
<ul>
<li>Network performance with complex queries</li>
<li>Caching strategies and complexity</li>
<li>Learning curve for the team</li>
<li>Tooling and debugging capabilities</li>
<li>Security implications</li>
</ul>

<p>I've heard GraphQL can reduce over-fetching but might increase complexity. What are your experiences with both approaches in production?</p>""",
        "tags": ["graphql", "rest", "api", "performance", "mobile"]
    },
    {
        "title": "Database design: When to use NoSQL vs SQL for modern applications?",
        "description": """<p>I'm designing the database architecture for a new application and struggling with the NoSQL vs SQL decision. The application will handle various data types and access patterns.</p>

<p><strong>Data characteristics:</strong></p>
<ul>
<li>User profiles and preferences</li>
<li>Time-series data (logs, metrics)</li>
<li>Document-style content</li>
<li>Relational data (orders, products)</li>
<li>High write throughput expected</li>
</ul>

<p>I'm considering a polyglot approach, but I'm worried about complexity. What are the current best practices for database selection in 2025?</p>""",
        "tags": ["database", "nosql", "sql", "architecture", "design"]
    },
    {
        "title": "Security best practices for modern web applications",
        "description": """<p>I'm building a web application that will handle sensitive user data and need to implement proper security measures. I want to ensure I'm following current best practices.</p>

<p><strong>Security requirements:</strong></p>
<ul>
<li>User authentication and authorization</li>
<li>Data encryption (at rest and in transit)</li>
<li>API security and rate limiting</li>
<li>Input validation and sanitization</li>
<li>Audit logging and monitoring</li>
</ul>

<p>I'm familiar with OAuth 2.0, JWT tokens, and HTTPS, but I'm concerned about newer threats like supply chain attacks and AI-powered attacks. What should I focus on in 2025?</p>""",
        "tags": ["security", "web-development", "authentication", "encryption", "best-practices"]
    },
    {
        "title": "Performance optimization: Techniques for improving web application speed",
        "description": """<p>My web application is experiencing performance issues as it scales. I need to implement optimization strategies but I'm not sure where to start.</p>

<p><strong>Current issues:</strong></p>
<ul>
<li>Slow page load times</li>
<li>High database query times</li>
<li>Large bundle sizes</li>
<li>Poor mobile performance</li>
<li>Inefficient API calls</li>
</ul>

<p>I've heard about techniques like lazy loading, code splitting, and database indexing, but I need a systematic approach. What are the most impactful optimizations to implement first?</p>""",
        "tags": ["performance", "optimization", "web-development", "frontend", "backend"]
    },
    {
        "title": "Testing strategies for modern software development",
        "description": """<p>I'm implementing a comprehensive testing strategy for my development team, but I'm overwhelmed by the different types of tests and tools available.</p>

<p><strong>Testing needs:</strong></p>
<ul>
<li>Unit tests for business logic</li>
<li>Integration tests for API endpoints</li>
<li>End-to-end tests for critical user flows</li>
<li>Performance and load testing</li>
<li>Security testing</li>
</ul>

<p>I'm using Jest for unit tests and Cypress for E2E, but I'm not sure about the right balance and coverage targets. What testing strategies have you found most effective in 2025?</p>""",
        "tags": ["testing", "unit-tests", "integration-tests", "e2e", "quality-assurance"]
    }
]

# Sample user data for authors
SAMPLE_USERS = [
    {
        "user_id": "68729cf393bdcba189177d87",
        "name": "Dhruv",
        "email": "dhruv@gmail.com",
        "picture": "https://links.aryanranderiya.com/l/default_user"
    },
    {
        "user_id": "68729cf393bdcba189177d88",
        "name": "Sarah Chen",
        "email": "sarah.chen@example.com",
        "picture": "https://links.aryanranderiya.com/l/default_user"
    },
    {
        "user_id": "68729cf393bdcba189177d89",
        "name": "Alex Rodriguez",
        "email": "alex.rodriguez@example.com",
        "picture": "https://links.aryanranderiya.com/l/default_user"
    },
    {
        "user_id": "68729cf393bdcba189177d90",
        "name": "Emily Watson",
        "email": "emily.watson@example.com",
        "picture": "https://links.aryanranderiya.com/l/default_user"
    },
    {
        "user_id": "68729cf393bdcba189177d91",
        "name": "Michael Kim",
        "email": "michael.kim@example.com",
        "picture": "https://links.aryanranderiya.com/l/default_user"
    }
]

async def get_existing_users() -> List[Dict]:
    """Get existing users from the database."""
    try:
        db = init_mongodb()
        users_collection = db.get_collection("users")
        users = await users_collection.find({}, {"_id": 1, "name": 1, "email": 1, "picture": 1}).to_list(length=None)
        
        if users:
            return [
                {
                    "user_id": str(user["_id"]),
                    "name": user.get("name", "Unknown User"),
                    "email": user.get("email", "unknown@example.com"),
                    "picture": user.get("picture", "https://links.aryanranderiya.com/l/default_user")
                }
                for user in users
            ]
        else:
            print("⚠️  No existing users found, using sample users")
            return SAMPLE_USERS
    except Exception as e:
        print(f"⚠️  Error fetching users: {e}, using sample users")
        return SAMPLE_USERS

async def seed_questions():
    """Seed the database with programming questions."""
    print("🚀 Starting to seed programming questions...")
    
    # Initialize services
    qa_service = QAService()
    
    # Get users for authors
    users = await get_existing_users()
    print(f"📝 Found {len(users)} users to use as authors")
    
    # Create questions
    created_count = 0
    for i, question_data in enumerate(PROGRAMMING_QUESTIONS):
        try:
            # Select a random user as author
            author = random.choice(users)
            
            # Create question request
            question_request = QuestionCreateRequest(
                title=question_data["title"],
                description=question_data["description"],
                tags=question_data["tags"]
            )
            
            # Create the question
            question = await qa_service.create_question(
                question_data=question_request,
                author_id=author["user_id"],
                author_name=author["name"],
                author_email=author["email"]
            )
            
            if question:
                created_count += 1
                print(f"✅ Created question {created_count}/{len(PROGRAMMING_QUESTIONS)}: {question.title[:50]}...")
                print(f"   Author: {author['name']}")
                print(f"   Tags: {', '.join(question.tags)}")
                print()
            else:
                print(f"❌ Failed to create question {i + 1}")
                
        except Exception as e:
            print(f"❌ Error creating question {i + 1}: {e}")
            # Continue with next question even if one fails
            continue
    
    print(f"🎉 Successfully created {created_count} programming questions!")
    print(f"📊 Total questions in database: {created_count}")
    
    if created_count < len(PROGRAMMING_QUESTIONS):
        print(f"⚠️  {len(PROGRAMMING_QUESTIONS) - created_count} questions failed to create")
        print("💡 This might be due to ChromaDB not running. Questions are still saved to MongoDB.")
        print("💡 To enable semantic search, start ChromaDB with: docker run -p 8000:8000 chromadb/chroma")

if __name__ == "__main__":
    asyncio.run(seed_questions()) 