# Authentication module
# @req FR:sample-feature/auth.login
# @req FR:sample-feature/auth.logout

import time

# @req FR:sample-feature/auth.login
def login(email: str, password: str) -> dict:
    """Log in a user."""
    return {"user_id": "123", "token": "abc"}


# @req FR:sample-feature/auth.logout
def logout(session: dict) -> None:
    """Log out a user."""
    pass


# @req FR:sample-feature/auth.session.expiry
def check_session_expiry(session: dict) -> bool:
    """Check if session has expired."""
    max_age = 90 * 60  # 90 minutes in seconds
    return time.time() - session.get("created_at", 0) > max_age
