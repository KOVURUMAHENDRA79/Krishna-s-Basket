from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# The database will be a file named "ecommerce.db" inside the server folder.
SQLALCHEMY_DATABASE_URL = "sqlite:///./ecommerce.db"

# Setting 'check_same_thread' to False is a special requirement only for SQLite inside FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# This creates a "factory" to generate database sessions so users don't overwrite each other
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All our future database models will inherit from this Base class
Base = declarative_base()
