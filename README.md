# Drive Alive - Driving School Booking App

## Overview
Cross-platform mobile and web application for South African driving schools. Students can book lessons with instructors, handle payments in-app, and receive GPS-based pickup/drop-off with WhatsApp reminders.

## Tech Stack

### Frontend
- **React Native + Expo** - Cross-platform mobile (iOS/Android) and web
- **React Navigation** - Navigation and routing
- **Expo Location** - GPS tracking and location services
- **React Native Maps** - Map integration
- **Stripe React Native** - Payment processing
- **Axios** - API communication
- **Firebase** - Authentication and real-time features

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Primary database
- **Celery + Redis** - Background task processing
- **Stripe/PayFast** - Payment gateway integration
- **WhatsApp Business API** - Automated reminders

## Project Structure

```
driving-school-app/
├── frontend/              # React Native + Expo mobile/web app
├── backend/               # FastAPI Python backend with venv
├── docs/                  # Documentation
├── config/                # Configuration files
├── tests/                 # Testing suites
└── .vscode/              # VS Code workspace settings
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.11+
- PostgreSQL 14+
- Redis (for background tasks)
- Expo CLI (`npm install -g expo-cli`)

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npx expo start
```

## Features

### Phase 1: MVP
- User registration & authentication
- Instructor GPS location & availability
- Student booking system
- Payment integration (Stripe/PayFast)
- Cancellation policy enforcement

### Phase 2: Core Features
- WhatsApp reminders
- Push notifications
- Instructor/student dashboards
- Web support (React Native Web)

### Phase 3: Advanced Features
- Live lesson tracking
- Lesson packages
- Certification tracking
- Multi-language support (English, Afrikaans, Zulu)
- Analytics dashboard

### Phase 4: Admin & Compliance
- Admin dashboard
- POPIA compliance (South African data protection)
- PCI DSS compliance (payment security)

## Compliance

### POPIA (Protection of Personal Information Act)
- User data encryption at rest and in transit
- Consent management for data collection
- Data retention policies
- User rights implementation (access, deletion, portability)

### PCI DSS (Payment Card Industry Data Security Standard)
- No storage of sensitive card data
- Secure payment tokenization via Stripe/PayFast
- Regular security audits
- Network security and monitoring

## Development

See [AGENTS.md](docs/AGENTS.md) for team roles and responsibilities.
See [API.md](docs/API.md) for API documentation.
See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design.

## License
MIT License - See LICENSE file for details

## Contact
For questions or support, please open an issue on GitHub.
