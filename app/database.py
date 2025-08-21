from typing import Iterator
from sqlmodel import SQLModel, create_engine, Session
from .config import get_settings


engine = None


def init_db() -> None:
	global engine
	if engine is None:
		settings = get_settings()
		engine = create_engine(settings.database_url, echo=False, future=True)
		SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
	assert engine is not None, "Database engine not initialized"
	with Session(engine) as session:
		yield session
