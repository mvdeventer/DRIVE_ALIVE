"""
Main FastAPI application
"""

import asyncio
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, engine, SessionLocal
from .models.user import User, UserRole, UserStatus
from .utils.auth import get_password_hash
from .routes import (
    admin,
    auth,
    availability,
    bookings,
    database,
    database_interface,
    instructors,
    payments,
    setup,
    students,
    verification,
)
from .services.reminder_scheduler import reminder_scheduler
from .services.backup_scheduler import backup_scheduler
from .services.verification_cleanup_scheduler import verification_cleanup_scheduler

# Create database tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    Handles background task lifecycle
    """
    # Startup
    print("=" * 80)
    print("Drive Alive Backend API - Starting Up")
    print("=" * 80)
    print(f"Python Path: {sys.executable}")
    venv_status = "Active" if "venv" in sys.executable else "Not Active"
    print(f"Virtual Environment: {venv_status}")
    print(f"API Version: 1.0.0")
    print(
        f"WhatsApp Reminders: {'Enabled' if settings.TWILIO_ACCOUNT_SID else 'Disabled'}"
    )
    print("=" * 80)

    # Create all tables (if they don't exist)
    print("\n📊 Ensuring database tables exist...")
    try:
        from .database import Base, engine
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables ready")
    except Exception as e:
        print(f"⚠️  Warning initializing tables: {e}")

    # Check admin status (no longer auto-creating admin - use setup screen)
    print("\n🔐 Checking for admin user...")
    db = SessionLocal()
    try:
        # Use a simple approach: try to query, catch if table structure issue
        try:
            existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).all()
            if existing_admin:
                print(f"✅ Admin user exists: {existing_admin[0].email}")
            else:
                print("⚠️  No admin user found - setup required")
                print("📋 Navigate to the app to create an admin via the setup screen")
        except Exception as query_error:
            # If query fails due to schema issues, recreate tables
            print(f"⚠️  Database schema issue detected: {query_error}")
            print("🔨 Recreating database schema...")
            from .database import Base, engine
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
            print("✅ Database schema recreated successfully")
    finally:
        db.close()

    # Start background reminder scheduler
    task = None
    if settings.TWILIO_ACCOUNT_SID:
        print("🚀 Starting WhatsApp reminder scheduler...")
        task = asyncio.create_task(reminder_scheduler.start())
    
    # Start backup scheduler
    print("🔄 Starting automated backup scheduler...")
    backup_task = asyncio.create_task(backup_scheduler.start())

    # Start verification cleanup scheduler
    print("🧹 Starting verification cleanup scheduler...")
    verification_cleanup_task = asyncio.create_task(verification_cleanup_scheduler.start())

    yield

    # Shutdown
    if settings.TWILIO_ACCOUNT_SID:
        print("🛑 Stopping WhatsApp reminder scheduler...")
        await reminder_scheduler.stop()
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    
    # Stop backup scheduler
    print("🛑 Stopping backup scheduler...")
    await backup_scheduler.stop()
    if backup_task:
        backup_task.cancel()
        try:
            await backup_task
        except asyncio.CancelledError:
            pass

    # Stop verification cleanup scheduler
    print("🛑 Stopping verification cleanup scheduler...")
    await verification_cleanup_scheduler.stop()
    if verification_cleanup_task:
        verification_cleanup_task.cancel()
        try:
            await verification_cleanup_task
        except asyncio.CancelledError:
            pass


# Create FastAPI app with lifespan
app = FastAPI(
    title="Driving School Booking API",
    description="API for South African driving school booking system",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS - Allow specific origins with credentials
origins = [
    "http://localhost:8081",  # Web version on localhost
    "http://localhost:8082",
    "http://localhost:8080",
    "http://localhost:3000",
    "http://10.0.0.121:8081",
    "http://10.0.0.121:8082",
    "http://10.0.0.121:8080",
    "http://10.0.0.121:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3000",
    "http://10.0.0.121:19000",
    "http://10.0.0.121:19001",
    "http://10.0.0.121:19006",
    "https://drive-alive-2.onrender.com",  # Production frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Specific origins for credentials support
    allow_credentials=True,  # Must be True with specific origins
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    """
    Custom handler for validation errors to provide user-friendly error messages
    """
    errors = exc.errors()

    # Extract the first error for a cleaner message
    if errors:
        first_error = errors[0]
        field = first_error.get("loc", [])[-1] if first_error.get("loc") else "field"
        msg = first_error.get("msg", "Validation error")

        # Create a user-friendly error message
        if "id_number" in str(field):
            # Use the custom error message from the validator
            error_detail = msg.replace("Value error, ", "")
        else:
            error_detail = f"{field}: {msg}"

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": error_detail},
        )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error occurred"},
    )


# Include routers
app.include_router(setup.router)  # ⚠️ REMOVE AFTER CREATING ADMIN USER
app.include_router(admin.router)
app.include_router(database.router)
app.include_router(database_interface.router)  # 🗄️ Database Interface (Admin CRUD)
app.include_router(auth.router)
app.include_router(verification.router)
app.include_router(availability.router)
app.include_router(bookings.router)
app.include_router(instructors.router)
app.include_router(payments.router)
app.include_router(students.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Driving School Booking API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
