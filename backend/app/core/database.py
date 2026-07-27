from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Create async engine for SQLite (using aiosqlite driver)
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Configure session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Declarative base class for models
Base = declarative_base()

# FastAPI dependency to yield async session
async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
