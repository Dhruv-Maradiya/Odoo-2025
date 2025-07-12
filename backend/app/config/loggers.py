from app.utils.logging_utils import get_logger

# Application loggers - each will be a singleton instance
app_logger = get_logger(name="main")
auth_logger = get_logger(name="auth")
mongo_logger = get_logger(name="mongodb")
redis_logger = get_logger(name="redis")
request_logger = get_logger(name="request")
