"""
Company service - business logic for instructor companies / driving schools
"""
import re
from sqlalchemy.orm import Session

from ..models.company import Company
from ..models.user import Instructor


def slugify(name: str) -> str:
    """Convert a company name to a URL-safe slug. e.g. 'Cape Town Drivers' → 'cape-town-drivers'"""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def _unique_slug(db: Session, base_slug: str) -> str:
    """Ensure the slug is unique; append -2, -3 … on collision."""
    slug = base_slug
    counter = 2
    while db.query(Company).filter(Company.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def get_all_active_companies(db: Session) -> list[Company]:
    """Return all active companies (for dropdown)."""
    return db.query(Company).filter(Company.is_active.is_(True)).order_by(Company.name).all()


def get_company_by_id(db: Session, company_id: int) -> Company | None:
    return db.query(Company).filter(Company.id == company_id).first()


def create_company(db: Session, name: str) -> Company:
    """Create a new company with a unique slug."""
    base_slug = slugify(name)
    slug = _unique_slug(db, base_slug)
    company = Company(name=name.strip(), slug=slug)
    db.add(company)
    db.flush()  # get id without committing
    return company


def get_company_owner(db: Session, company_id: int) -> Instructor | None:
    """Return the owning instructor for this company, or None."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or not company.owner_instructor_id:
        return None
    return db.query(Instructor).filter(Instructor.id == company.owner_instructor_id).first()
