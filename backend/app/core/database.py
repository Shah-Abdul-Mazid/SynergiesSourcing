from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from pymongo import ASCENDING

# Initialize Motor client
client = AsyncIOMotorClient(settings.MONGODB_URI)

def get_database():
    return client[settings.MONGODB_DB_NAME]

# FastAPI dependency to provide a database instance per request
async def get_db():
    db = get_database()
    try:
        yield db
    finally:
        # Motor client does not require explicit close per request
        pass
