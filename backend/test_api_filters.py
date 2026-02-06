"""
Test the database interface API endpoint to see what it returns
"""
import requests

API_BASE = "http://localhost:8000"

# First login as admin
login_response = requests.post(
    f"{API_BASE}/auth/login",
    data={
        "username": "mvdeventer123@gmail.com",
        "password": "your_actual_password_here"  # Update this with Martin's real password
    }
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit()

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("=== Testing Database Interface API ===\n")

# Test 1: Get ALL users (no filters)
print("1. GET /admin/database-interface/users (NO FILTERS)")
response = requests.get(
    f"{API_BASE}/admin/database-interface/users",
    headers=headers
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Total users: {data['meta']['total']}")
    for user in data['data']:
        print(f"  - {user['first_name']} {user['last_name']} ({user['role']})")
else:
    print(f"Error: {response.text}")

print("\n" + "="*60 + "\n")

# Test 2: Filter by STUDENT
print("2. GET /admin/database-interface/users?filter_role=STUDENT")
response = requests.get(
    f"{API_BASE}/admin/database-interface/users?filter_role=STUDENT",
    headers=headers
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Total students: {data['meta']['total']}")
    for user in data['data']:
        print(f"  - {user['first_name']} {user['last_name']} ({user['role']})")
else:
    print(f"Error: {response.text}")

print("\n" + "="*60 + "\n")

# Test 3: Filter by INSTRUCTOR
print("3. GET /admin/database-interface/users?filter_role=INSTRUCTOR")
response = requests.get(
    f"{API_BASE}/admin/database-interface/users?filter_role=INSTRUCTOR",
    headers=headers
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Total instructors: {data['meta']['total']}")
    for user in data['data']:
        print(f"  - {user['first_name']} {user['last_name']} ({user['role']})")
else:
    print(f"Error: {response.text}")

print("\n" + "="*60 + "\n")

# Test 4: Filter by ADMIN
print("4. GET /admin/database-interface/users?filter_role=ADMIN")
response = requests.get(
    f"{API_BASE}/admin/database-interface/users?filter_role=ADMIN",
    headers=headers
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Total admins: {data['meta']['total']}")
    for user in data['data']:
        print(f"  - {user['first_name']} {user['last_name']} ({user['role']})")
else:
    print(f"Error: {response.text}")
