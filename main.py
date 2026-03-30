from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import init_db
from login import router as login_router
from posts import router as posts_router
from registration import router as registration_router
from users import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
SPA_ENTRYPOINT = FRONTEND_DIR / "index.html"

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


def render_spa_shell() -> FileResponse:
    return FileResponse(SPA_ENTRYPOINT)


@app.get("/")
def root():
    return render_spa_shell()


@app.get("/login_page")
def login_page():
    return render_spa_shell()


@app.get("/register_page")
def register_page():
    return render_spa_shell()


@app.get("/feed_page")
def feed_page():
    return render_spa_shell()


app.include_router(registration_router)
app.include_router(login_router)
app.include_router(users_router)
app.include_router(posts_router)
