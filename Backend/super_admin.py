import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, UserRole
from app.auth import hash_password
from datetime import datetime, timedelta
from app.config import now_utc

def create_super_admin(username, email, password, fullname=None):
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if existing_user:
            print(f"Error: User with username '{username}' or email '{email}' already exists.")
            return

        # Create new super admin
        new_user = User(
            username=username,
            email=email,
            password=hash_password(password),
            fullname=fullname or username,
            user_type=UserRole.super_admin,
            is_active=True,
            trial_ends_at=now_utc() + timedelta(days=3650) # 10 years for super admin
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"Super admin user created successfully:")
        print(f"ID: {new_user.id}")
        print(f"Username: {new_user.username}")
        print(f"Email: {new_user.email}")
        print(f"Role: {new_user.user_type.value}")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python super_admin.py <username> <email> <password> [fullname]")
        sys.exit(1)

    username = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3]
    fullname = sys.argv[4] if len(sys.argv) > 4 else None

    create_super_admin(username, email, password, fullname)
