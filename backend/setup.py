"""
Drive Alive Backend Setup Configuration
Manages backend packaging and dependencies
"""

import os

from setuptools import find_packages, setup


# Read version from VERSION file
def get_version():
    version_file = os.path.join(os.path.dirname(__file__), "..", "VERSION")
    if os.path.exists(version_file):
        with open(version_file, "r") as f:
            return f.read().strip()
    return "1.0.0"


# Read requirements
def get_requirements():
    req_file = os.path.join(os.path.dirname(__file__), "requirements.txt")
    with open(req_file, "r") as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]


setup(
    name="drive-alive-backend",
    version=get_version(),
    description="Drive Alive - Driving School Booking Platform Backend",
    author="Drive Alive Team",
    author_email="info@drivealive.co.za",
    packages=find_packages(),
    include_package_data=True,
    install_requires=get_requirements(),
    python_requires=">=3.9",
    entry_points={
        "console_scripts": [
            "drive-alive-api=app.main:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)
