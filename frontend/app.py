import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import streamlit as st

st.set_page_config(
    page_title="Expense Intelligence",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded",
)

from auth_page import show as show_auth
from utils import is_authenticated

if not is_authenticated():
    show_auth()
else:
    st.sidebar.title("💰 Expense Intelligence")
    st.sidebar.markdown(f"Logged in as **{st.session_state.get('username', 'User')}**")
    st.sidebar.divider()

    if st.sidebar.button("Logout", use_container_width=True):
        st.session_state.clear()
        st.rerun()

    st.title("Welcome back 👋")
    st.markdown(
        "Use the sidebar to navigate between pages. "
        "Start with **Overview** for a summary of your latest month."
    )
    st.info("Upload a CSV from the **Transactions** page to get started.")