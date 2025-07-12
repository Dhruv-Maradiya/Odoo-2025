"""
Authentication utilities for password hashing and JWT token management.
"""

import base64
import json
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
from fastapi import HTTPException, status

from app.config.settings import settings


class AuthUtils:
    """Utility class for authentication operations."""

    _secret_key: Optional[str] = None

    @classmethod
    def get_secret_key(cls) -> str:
        """Get or generate a secret key for JWT operations."""
        if cls._secret_key is None:
            cls._secret_key = getattr(settings, "JWT_SECRET_KEY", None)
            if cls._secret_key is None:
                # Generate a consistent secret key for the session
                cls._secret_key = secrets.token_urlsafe(32)
        return cls._secret_key

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        password_bytes = password.encode("utf-8")
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)

    @classmethod
    def _create_simple_token(cls, payload: Dict[str, Any]) -> str:
        """Create a simple base64 encoded token (for development/testing)."""
        # This is a simplified token implementation
        # In production, you should use proper JWT with PyJWT library
        token_data = {"payload": payload, "signature": cls._simple_sign(payload)}
        token_json = json.dumps(token_data, separators=(",", ":"))
        return base64.urlsafe_b64encode(token_json.encode()).decode()

    @classmethod
    def _simple_sign(cls, payload: Dict[str, Any]) -> str:
        """Create a simple signature for the payload."""
        payload_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        secret = cls.get_secret_key()
        import hashlib

        return hashlib.sha256((payload_str + secret).encode()).hexdigest()

    @classmethod
    def _verify_simple_token(cls, token: str) -> Dict[str, Any]:
        """Verify and decode a simple token."""
        try:
            token_json = base64.urlsafe_b64decode(token.encode()).decode()
            token_data = json.loads(token_json)

            payload = token_data["payload"]
            signature = token_data["signature"]

            # Verify signature
            expected_signature = cls._simple_sign(payload)
            if signature != expected_signature:
                raise ValueError("Invalid signature")

            # Check expiration
            if payload.get("exp", 0) < time.time():
                raise ValueError("Token expired")

            return payload

        except Exception:
            raise ValueError("Invalid token")

    @classmethod
    def generate_jwt_token(
        cls,
        user_id: str,
        email: str,
        role: str,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """Generate a JWT token for the user."""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(hours=24)

        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "exp": int(expire.timestamp()),
            "iat": int(datetime.now(timezone.utc).timestamp()),
            "type": "access",
        }

        try:
            return cls._create_simple_token(payload)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Token generation failed: {str(e)}",
            )

    @classmethod
    def decode_jwt_token(cls, token: str) -> Dict[str, Any]:
        """Decode and verify a JWT token."""
        try:
            return cls._verify_simple_token(token)
        except ValueError as e:
            error_msg = str(e)
            if "expired" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token validation failed: {str(e)}",
            )

    @classmethod
    def generate_refresh_token(cls, user_id: str) -> str:
        """Generate a refresh token."""
        expire = datetime.now(timezone.utc) + timedelta(days=30)
        payload = {
            "sub": user_id,
            "exp": int(expire.timestamp()),
            "iat": int(datetime.now(timezone.utc).timestamp()),
            "type": "refresh",
        }

        try:
            return cls._create_simple_token(payload)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Refresh token generation failed: {str(e)}",
            )
