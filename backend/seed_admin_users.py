#!/usr/bin/env python3
"""
Script to seed the database with admin users.
This script creates admin users with proper roles and permissions.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

# Override environment variables for local execution
os.environ["CHROMADB_HOST"] = "http://localhost:8000"
os.environ["MONGO_DB"] = "mongodb://localhost:27017"

from app.db.mongodb.mongodb import init_mongodb
from app.services.user_service import create_user, get_user_by_email
from app.models.user_models import UserRole

# Admin users to create
ADMIN_USERS = [
    {
        "name": "Admin User",
        "email": "admin@stackit.com",
        "password": "Admin123!",
        "role": UserRole.ADMIN
    },
    {
        "name": "Super Admin",
        "email": "superadmin@stackit.com", 
        "password": "SuperAdmin123!",
        "role": UserRole.ADMIN
    },
    {
        "name": "Platform Admin",
        "email": "platform@stackit.com",
        "password": "Platform123!",
        "role": UserRole.ADMIN
    }
]

async def seed_admin_users():
    """Seed the database with admin users."""
    try:
        print("🚀 Starting admin user seeding...")
        
        # Initialize MongoDB connection
        db = init_mongodb()
        print("✅ Connected to MongoDB")
        
        created_count = 0
        skipped_count = 0
        
        for admin_user in ADMIN_USERS:
            try:
                # Check if user already exists
                existing_user = await get_user_by_email(admin_user["email"])
                
                if existing_user:
                    print(f"⚠️  User {admin_user['email']} already exists, skipping...")
                    skipped_count += 1
                    continue
                
                # Create admin user
                user_data = await create_user(
                    email=admin_user["email"],
                    password=admin_user["password"],
                    name=admin_user["name"],
                    role=admin_user["role"]
                )
                
                print(f"✅ Created admin user: {user_data['name']} ({user_data['email']})")
                print(f"   Role: {user_data['role']}")
                print(f"   Permissions: {user_data['permissions']}")
                print(f"   User ID: {user_data['_id']}")
                print("   " + "-" * 50)
                
                created_count += 1
                
            except Exception as e:
                print(f"❌ Error creating admin user {admin_user['email']}: {e}")
        
        print("\n📊 Seeding Summary:")
        print(f"✅ Created: {created_count} admin users")
        print(f"⚠️  Skipped: {skipped_count} existing users")
        print(f"📝 Total processed: {created_count + skipped_count}")
        
        if created_count > 0:
            print("\n🔑 Admin Login Credentials:")
            for admin_user in ADMIN_USERS:
                print(f"   Email: {admin_user['email']}")
                print(f"   Password: {admin_user['password']}")
                print("   " + "-" * 30)
        
        print("\n🎉 Admin user seeding completed!")
        
    except Exception as e:
        print(f"❌ Error during admin user seeding: {e}")
        raise

async def list_admin_users():
    """List all admin users in the database."""
    try:
        print("🔍 Listing admin users...")
        
        # Initialize MongoDB connection
        db = init_mongodb()
        users_collection = db.get_collection("users")
        
        # Find all admin users
        admin_users = await users_collection.find(
            {"role": "admin"}, 
            {"password": 0}  # Exclude password field
        ).to_list(length=None)
        
        if admin_users:
            print(f"✅ Found {len(admin_users)} admin user(s):")
            print("=" * 60)
            
            for user in admin_users:
                print(f"👤 Name: {user.get('name', 'N/A')}")
                print(f"📧 Email: {user.get('email', 'N/A')}")
                print(f"🔑 Role: {user.get('role', 'N/A')}")
                print(f"📋 Permissions: {user.get('permissions', [])}")
                print(f"🆔 User ID: {user.get('_id', 'N/A')}")
                print(f"📅 Created: {user.get('created_at', 'N/A')}")
                print(f"✅ Active: {user.get('is_active', True)}")
                print("-" * 60)
        else:
            print("❌ No admin users found in the database")
            
    except Exception as e:
        print(f"❌ Error listing admin users: {e}")
        raise

async def delete_admin_users():
    """Delete all admin users from the database (use with caution!)."""
    try:
        print("🗑️  Deleting admin users...")
        
        # Initialize MongoDB connection
        db = init_mongodb()
        users_collection = db.get_collection("users")
        
        # Find and delete all admin users
        result = await users_collection.delete_many({"role": "admin"})
        
        print(f"✅ Deleted {result.deleted_count} admin user(s)")
        
    except Exception as e:
        print(f"❌ Error deleting admin users: {e}")
        raise

def main():
    """Main function to run the admin user seeding."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Admin user seeding script")
    parser.add_argument(
        "--action", 
        choices=["create", "list", "delete"], 
        default="create",
        help="Action to perform (default: create)"
    )
    parser.add_argument(
        "--email",
        help="Specific admin email to create (optional)"
    )
    parser.add_argument(
        "--password",
        help="Password for the admin user (optional)"
    )
    parser.add_argument(
        "--name",
        help="Name for the admin user (optional)"
    )
    
    args = parser.parse_args()
    
    if args.action == "create":
        if args.email and args.password and args.name:
            # Create a single admin user with custom credentials
            custom_admin = {
                "name": args.name,
                "email": args.email,
                "password": args.password,
                "role": UserRole.ADMIN
            }
            
            async def create_single_admin():
                try:
                    print("🚀 Creating single admin user...")
                    db = init_mongodb()
                    
                    # Check if user already exists
                    existing_user = await get_user_by_email(custom_admin["email"])
                    
                    if existing_user:
                        print(f"⚠️  User {custom_admin['email']} already exists!")
                        return
                    
                    # Create admin user
                    user_data = await create_user(
                        email=custom_admin["email"],
                        password=custom_admin["password"],
                        name=custom_admin["name"],
                        role=custom_admin["role"]
                    )
                    
                    print(f"✅ Created admin user: {user_data['name']} ({user_data['email']})")
                    print(f"   Role: {user_data['role']}")
                    print(f"   User ID: {user_data['_id']}")
                    
                except Exception as e:
                    print(f"❌ Error creating admin user: {e}")
            
            asyncio.run(create_single_admin())
        else:
            # Create default admin users
            asyncio.run(seed_admin_users())
    
    elif args.action == "list":
        asyncio.run(list_admin_users())
    
    elif args.action == "delete":
        confirm = input("⚠️  Are you sure you want to delete ALL admin users? (yes/no): ")
        if confirm.lower() == "yes":
            asyncio.run(delete_admin_users())
        else:
            print("❌ Operation cancelled")

if __name__ == "__main__":
    main() 