#!/usr/bin/env python3
"""Script to update user role to admin for testing purposes."""

import asyncio

from pymongo import MongoClient


async def update_user_to_admin():
    # Connect to MongoDB
    client = MongoClient("mongodb://localhost:27017")
    db = client.odoo_hackathon
    users_collection = db.users
    
    # Update user role
    result = users_collection.update_one(
        {"email": "admin@example.com"},
        {
            "$set": {
                "role": "admin",
                "permissions": [
                    "read:all", 
                    "write:all", 
                    "admin:users", 
                    "admin:questions", 
                    "admin:answers", 
                    "admin:comments", 
                    "admin:platform"
                ]
            }
        }
    )
    
    if result.modified_count > 0:
        print("✅ User role updated to admin successfully!")
        # Display updated user
        user = users_collection.find_one(
            {"email": "admin@example.com"}, 
            {"password": 0}
        )
        print(f"Updated user: {user}")
    else:
        print("❌ No user found with email admin@example.com")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_user_to_admin())
