import logging
from typing import Dict, Optional
from rich.logging import RichHandler

# Global dictionary to store logger instances
_loggers: Dict[str, logging.Logger] = {}


def get_logger(
    name: Optional[str] = None,
    log_level: int = logging.INFO,
    show_time: bool = True,
    show_level: bool = True,
    show_path: bool = False,
    rich_tracebacks: bool = True,
    tracebacks_extra_lines: int = 3,
    tracebacks_suppress: tuple = (),
) -> logging.Logger:
    """Create a logger with file and Rich console logging, including logger name in the message."""
    global _loggers
    logger_name = str(name).upper() or __name__

    # Return the existing logger if it's already created
    if logger_name in _loggers:
        return _loggers[logger_name]

    logger = logging.getLogger(logger_name)

    if not logger.handlers:
        logger.setLevel(log_level)
        logger.propagate = False

        # Rich console logging with logger name in the message
        console_handler = RichHandler(
            show_time=show_time,
            show_level=show_level,
            show_path=show_path,
            rich_tracebacks=rich_tracebacks,
            tracebacks_extra_lines=tracebacks_extra_lines,
            tracebacks_suppress=tracebacks_suppress,
        )

        # Custom formatter to include logger name in the log message
        # formatter = logging.Formatter(
        #     "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
        # )
        formatter = logging.Formatter("%(name)s | %(message)s")

        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    _loggers[logger_name] = logger
    return logger
