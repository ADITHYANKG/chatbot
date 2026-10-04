from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy.engine import Engine


def upgrade_database(engine: Engine) -> None:
    config = Config(str(Path(__file__).with_name("alembic.ini")))
    with engine.connect() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")