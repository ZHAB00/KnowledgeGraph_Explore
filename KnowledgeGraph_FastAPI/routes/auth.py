from fastapi import APIRouter, HTTPException
from passlib.hash import bcrypt
from jose import jwt
from db.models import LoginRequest, LoginResponse
from config import SECRET_KEY, TEST_USERNAME, TEST_PASSWORD

router = APIRouter(tags=["auth"])

_password_hash = bcrypt.hash(TEST_PASSWORD)


@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    if req.username != TEST_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.verify(req.password, _password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode({"sub": req.username}, SECRET_KEY, algorithm="HS256")
    return LoginResponse(token=token)


def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub", "")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    return verify_token(token)
