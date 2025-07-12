"""
Database indexes for MongoDB collections.
Minimal setup for authentication and user management.
"""

import asyncio

from app.config.loggers import app_logger as logger
from app.db.mongodb.collections import mongodb_instance, users_collection


async def create_all_indexes():
    """
    Create database indexes for optimal performance.
    This is called during application startup.
    """
    try:
        logger.info("Creating database indexes...")

        # Create user indexes
        await create_user_indexes()

        # Create saved posts indexes
        await create_saved_posts_indexes()

        logger.info("Database indexes created successfully")

    except Exception as e:
        logger.error(f"Error creating database indexes: {str(e)}")
        raise


async def create_user_indexes():
    """Create indexes for users collection."""
    try:
        # Unique index on email for user lookup and authentication
        await users_collection.create_index("email", unique=True, sparse=True)

        # Index on created_at for user registration analytics
        await users_collection.create_index("created_at")

        # Index on updated_at for recent activity queries
        await users_collection.create_index("updated_at")

        logger.info("User collection indexes created")

    except Exception as e:
        logger.error(f"Error creating user indexes: {str(e)}")
        raise


async def create_saved_posts_indexes():
    """Create indexes for saved_posts collection."""
    try:
        # Get saved_posts collection
        saved_posts_collection = mongodb_instance.get_collection("saved_posts")

        # Compound index for user queries: user_id + saved_at (descending for recent first)
        await saved_posts_collection.create_index([("user_id", 1), ("saved_at", -1)])

        # Compound index for checking if a post is saved: user_id + post_id + post_type
        await saved_posts_collection.create_index(
            [("user_id", 1), ("post_id", 1), ("post_type", 1)], unique=True
        )

        # Index for filtering by post type within user's saved posts
        await saved_posts_collection.create_index(
            [("user_id", 1), ("post_type", 1), ("saved_at", -1)]
        )

        logger.info("Saved posts collection indexes created")

    except Exception as e:
        logger.error(f"Error creating saved posts indexes: {str(e)}")
        raise


# Main function for CLI/standalone execution
async def main():
    """Main function for running index creation standalone."""
    await create_all_indexes()


if __name__ == "__main__":
    asyncio.run(main())
