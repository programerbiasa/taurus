import os

DB_HOST = os.getenv("DB_HOST", "172.16.5.254")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "4dm1nlm4")
DB_NAME = os.getenv("DB_NAME", "taurus")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

SECRET_KEY = os.getenv("SECRET_KEY", "taurus-python-secret-key-2024-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days
ROOT_PATH = "/taurus-py"
UPLOAD_DIR = "/var/www/taurus/backend/uploads" if os.path.exists("/var/www/taurus/backend/uploads") else os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
