from bson import ObjectId


def to_objectid(id_str):
    """Convert a string to ObjectId, or return as-is if already ObjectId."""
    if isinstance(id_str, ObjectId):
        return id_str
    try:
        return ObjectId(id_str)
    except Exception:
        return id_str


def to_str(obj_id):
    """Convert ObjectId to str, or return as-is if already str."""
    if isinstance(obj_id, ObjectId):
        return str(obj_id)
    return obj_id


def id_from_doc(doc):
    """Extract _id from MongoDB doc and return as str."""
    if doc and "_id" in doc:
        return to_str(doc["_id"])
    return None
