from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/postgres"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_posts_table()


def migrate_posts_table() -> None:
    with engine.begin() as conn:
        tables = set(inspect(conn).get_table_names())
        if "posts" not in tables:
            return

        column_rows = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'posts'"
            )
        ).fetchall()
        column_names = {row[0] for row in column_rows}

        # Legacy compatibility: align old "posts" table with current Post model.
        conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_id INTEGER"))
        conn.execute(text("UPDATE posts SET author_id = user_id WHERE author_id IS NULL AND user_id IS NOT NULL"))

        conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_path VARCHAR"))
        conn.execute(
            text(
                "UPDATE posts SET image_path = '/static/images/images.jfif' "
                "WHERE image_path IS NULL OR image_path = ''"
            )
        )

        conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
        conn.execute(text("UPDATE posts SET created_at = NOW() WHERE created_at IS NULL"))
        conn.execute(text("UPDATE posts SET caption = '' WHERE caption IS NULL"))

        # Old schema had these columns as NOT NULL; current insert path doesn't use them.
        if "user_id" in column_names:
            conn.execute(text("ALTER TABLE posts ALTER COLUMN user_id DROP NOT NULL"))
            conn.execute(text("UPDATE posts SET user_id = author_id WHERE user_id IS NULL AND author_id IS NOT NULL"))
        if "content_type" in column_names:
            conn.execute(text("ALTER TABLE posts ALTER COLUMN content_type DROP NOT NULL"))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_posts_author_id ON posts (author_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_posts_created_at ON posts (created_at)"))

        conn.execute(text("ALTER TABLE posts ALTER COLUMN author_id SET NOT NULL"))
        conn.execute(text("ALTER TABLE posts ALTER COLUMN image_path SET NOT NULL"))
        conn.execute(text("ALTER TABLE posts ALTER COLUMN created_at SET NOT NULL"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
