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

from .config import settings
from .database import Base, engine
from .routes import (
    admin,
    auth,
    availability,
    bookings,
    instructors,
    payments,
    setup,
    students,
)
from .services.reminder_scheduler import reminder_scheduler

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

    # Start background reminder scheduler
    if settings.TWILIO_ACCOUNT_SID:
        print("🚀 Starting WhatsApp reminder scheduler...")
        task = asyncio.create_task(reminder_scheduler.start())

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
app.include_router(auth.router)
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
