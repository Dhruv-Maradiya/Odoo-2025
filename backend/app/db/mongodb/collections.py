"""
Module to expose commonly used MongoDB collections.
"""

from app.db.mongodb.mongodb import init_mongodb

mongodb_instance = init_mongodb()

users_collection = mongodb_instance.get_collection("users")
