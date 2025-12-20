"""
Authentication routes
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.user import InstructorCreate, InstructorResponse, StudentCreate, StudentResponse, Token, UserLogin, UserResponse
from ..services.auth import AuthService
from ..utils.auth import decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)) -> User:
    """
    Get current authenticated user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


@router.post("/register/student", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_student(student_data: StudentCreate, db: Session = Depends(get_db)):
    """
    Register a new student
    """
    user, student = AuthService.create_student(db, student_data)
    token = AuthService.create_user_token(user)

    return {
        "user": UserResponse.model_validate(user),
        "student_id": student.id,
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/register/instructor", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_instructor(instructor_data: InstructorCreate, db: Session = Depends(get_db)):
    """
    Register a new instructor
    """
    try:
        print(f"[DEBUG] Received instructor registration data: {instructor_data}")
        user, instructor = AuthService.create_instructor(db, instructor_data)
        token = AuthService.create_user_token(user)

        return {
            "user": UserResponse.model_validate(user),
            "instructor_id": instructor.id,
            "access_token": token,
            "token_type": "bearer",
        }
    except Exception as e:
        print(f"[ERROR] Registration failed: {type(e).__name__}: {str(e)}")
        import traceback

        traceback.print_exc()
        raise


@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
):
    """
    Login with email and password
    """
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = AuthService.create_user_token(user)

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get current user information
    """
    return UserResponse.model_validate(current_user)
