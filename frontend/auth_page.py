import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
import streamlit as st
import requests

API_BASE = "http://localhost:8000"


def show():
    st.title("Expense Intelligence Platform")
    st.markdown("Your personal finance analytics — fully local, fully private.")
    st.divider()

    tab1, tab2 = st.tabs(["Login", "Register"])

    with tab1:
        st.subheader("Login")
        username = st.text_input("Username", key="login_username")
        password = st.text_input("Password", type="password", key="login_password")

        if st.button("Login", use_container_width=True):
            if not username or not password:
                st.error("Please enter both username and password.")
            else:
                try:
                    response = requests.post(
                        f"{API_BASE}/auth/login",
                        data={"username": username, "password": password},
                        timeout=10,
                    )
                    if response.status_code == 200:
                        token = response.json()["access_token"]
                        st.session_state["token"] = token
                        st.session_state["username"] = username
                        st.success("Logged in successfully!")
                        st.rerun()
                    else:
                        st.error("Incorrect username or password.")
                except requests.exceptions.ConnectionError:
                    st.error("Cannot connect to backend. Is the FastAPI server running?")

    with tab2:
        st.subheader("Create Account")
        new_username = st.text_input("Username", key="reg_username")
        new_email = st.text_input("Email", key="reg_email")
        new_password = st.text_input("Password", type="password", key="reg_password")

        if st.button("Register", use_container_width=True):
            if not new_username or not new_email or not new_password:
                st.error("All fields are required.")
            else:
                try:
                    response = requests.post(
                        f"{API_BASE}/auth/register",
                        json={
                            "username": new_username,
                            "email": new_email,
                            "password": new_password,
                        },
                        timeout=10,
                    )
                    if response.status_code == 201:
                        st.success("Account created! Please log in.")
                    else:
                        detail = response.json().get("detail", "Registration failed.")
                        st.error(detail)
                except requests.exceptions.ConnectionError:
                    st.error("Cannot connect to backend.")