"""
Main FastAPI application
"""

import sys

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import Base, engine
from .routes import admin, auth, availability, bookings, instructors, payments, students

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="Driving School Booking API", description="API for South African driving school booking system", version="1.0.0")

# Configure CORS - Allow specific origins with credentials
origins = [
    "http://localhost:8081",
    "http://localhost:8080",
    "http://localhost:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3000",
    "http://localhost:19000",
    "http://localhost:19001",
    "http://localhost:19006",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Specific origins required when credentials=True
    allow_credentials=True,
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

        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": error_detail})

    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": "Validation error occurred"})


# Force reload

# Include routers
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(availability.router)
app.include_router(bookings.router)
app.include_router(instructors.router)
app.include_router(payments.router)
app.include_router(students.router)


@app.on_event("startup")
async def startup_event():
    """Log startup information including Python path to verify venv usage"""
    print("=" * 80)
    print("Drive Alive Backend API - Starting Up")
    print("=" * 80)
    print(f"Python Path: {sys.executable}")
    venv_status = "Active" if "venv" in sys.executable else "Not Active"
    print(f"Virtual Environment: {venv_status}")
    print(f"API Version: 1.0.0")
    print("=" * 80)


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Driving School Booking API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
