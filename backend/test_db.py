
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError("DATABASE_URL is missing from your .env file")

engine = create_engine(database_url)

try:
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_user, current_database()")
        )
        user, database = result.fetchone()
        print("Database connection successful!")
        print("User:", user)
        print("Database:", database)
except Exception as error:
    print("Database connection failed.")
    print(type(error).__name__, error)
finally:
    engine.dispose()