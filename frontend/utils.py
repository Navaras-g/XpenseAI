import streamlit as st
import requests

API_BASE = "http://localhost:8000"


def get_headers() -> dict:
    token = st.session_state.get("token")
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def is_authenticated() -> bool:
    return "token" in st.session_state and st.session_state["token"] is not None


def api_get(endpoint: str, params: dict = None) -> dict | None:
    try:
        response = requests.get(
            f"{API_BASE}{endpoint}",
            headers=get_headers(),
            params=params,
            timeout=10,
        )
        if response.status_code == 401:
            st.session_state.clear()
            st.rerun()
        if response.status_code == 200:
            return response.json()
        st.error(f"API error {response.status_code}: {response.json().get('detail', 'Unknown error')}")
        return None
    except requests.exceptions.ConnectionError:
        st.error("Cannot connect to backend. Make sure the FastAPI server is running on port 8000.")
        return None


def api_post(endpoint: str, data: dict = None, files=None) -> dict | None:
    try:
        response = requests.post(
            f"{API_BASE}{endpoint}",
            headers=get_headers() if not files else {
                "Authorization": f"Bearer {st.session_state.get('token', '')}"
            },
            json=data if not files else None,
            files=files,
            timeout=30,
        )
        if response.status_code == 401:
            st.session_state.clear()
            st.rerun()
        return response.json()
    except requests.exceptions.ConnectionError:
        st.error("Cannot connect to backend.")
        return None


def api_patch(endpoint: str, params: dict = None) -> dict | None:
    try:
        response = requests.patch(
            f"{API_BASE}{endpoint}",
            headers=get_headers(),
            params=params,
            timeout=10,
        )
        return response.json()
    except requests.exceptions.ConnectionError:
        st.error("Cannot connect to backend.")
        return None


def require_auth():
    """Call at the top of every page. Redirects to login if not authenticated."""
    if not is_authenticated():
        st.warning("Please log in to continue.")
        st.stop()


def format_currency(amount: float) -> str:
    """Format a number as NPR currency."""
    return f"NPR {amount:,.0f}"


def month_selector(label: str = "Select Month", key: str = "month") -> str:
    """Reusable month picker returning YYYY-MM string."""
    import datetime
    months = []
    today = datetime.date.today()
    for i in range(36):
        month_offset = today.month - 1 - i
        year = today.year + month_offset // 12
        month = month_offset % 12 + 1
        months.append(f"{year}-{month:02d}")
    return st.selectbox(label, months, key=key)