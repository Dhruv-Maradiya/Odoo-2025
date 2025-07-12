from contextlib import asynccontextmanager

from app.config.loggers import app_logger as logger
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Handles startup and shutdown events.
    """
    try:
        logger.info("Starting up the API...")

        # Create database indexes
        try:
            from app.db.mongodb.mongodb import init_mongodb

            mongo_client = init_mongodb()
            await mongo_client._initialize_indexes()
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create database indexes: {e}")

        logger.info("API startup completed successfully")

        yield  # Application is running

    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise
    finally:
        logger.info("API is shutting down...")
        # Cleanup tasks would go here if needed
        logger.info("API shutdown complete")
