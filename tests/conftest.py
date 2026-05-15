import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INSTANCE_DIR = ROOT / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)

os.environ.setdefault("SECRET_KEY", "pytest-secret-key-for-local-test-suite")
os.environ.setdefault("SQLCIPHER_DATABASE_KEY", "pytest-sqlcipher-key-for-local-tests")
os.environ.setdefault("SAVE_PAYLOAD_KEYS", "v1:cHl0ZXN0LXNhdmUta2V5LTMyLWJ5dGUtdmFsdWUhISE")
pytest_db_path = Path(tempfile.gettempdir()) / f"pytest_cits3403_{os.getpid()}.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{pytest_db_path.as_posix()}")
os.environ.setdefault("FLASK_APP", "app:app")
os.environ.setdefault("ALLOW_PLAINTEXT_TEST_DATABASES", "1")

subprocess.run(
    [sys.executable, "-m", "flask", "--app", "app:app", "db", "upgrade"],
    cwd=ROOT,
    env=os.environ.copy(),
    check=True,
)
