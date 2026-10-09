
from database import Base, engine
import models

Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")
print("Tables:", list(Base.metadata.tables.keys()))