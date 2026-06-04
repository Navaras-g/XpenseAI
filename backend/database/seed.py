from backend.database.connection import SessionLocal
from backend.database.models import Category


CATEGORIES = [
    # Expense categories
    {"category_name": "Food & Dining",      "is_income": False},
    {"category_name": "Transport",          "is_income": False},
    {"category_name": "Utilities",          "is_income": False},
    {"category_name": "Shopping",           "is_income": False},
    {"category_name": "Entertainment",      "is_income": False},
    {"category_name": "Health",             "is_income": False},
    {"category_name": "Subscriptions",      "is_income": False},
    {"category_name": "Education",          "is_income": False},
    {"category_name": "Travel",             "is_income": False},
    {"category_name": "Rent & Housing",     "is_income": False},
    {"category_name": "Insurance",          "is_income": False},
    {"category_name": "Transfers",          "is_income": False},
    {"category_name": "Other Expense",      "is_income": False},
    # Income categories
    {"category_name": "Salary",             "is_income": True},
    {"category_name": "Freelance",          "is_income": True},
    {"category_name": "Other Income",       "is_income": True},
]


def seed_categories():
    db = SessionLocal()
    try:
        existing = db.query(Category).count()
        if existing > 0:
            print(f"Categories already seeded ({existing} found). Skipping.")
            return

        for cat in CATEGORIES:
            db.add(Category(**cat))
        db.commit()
        print(f"Seeded {len(CATEGORIES)} categories successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_categories()