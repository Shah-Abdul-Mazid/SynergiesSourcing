import sqlite3
import os

db_path = "apparel_erp.db"
if not os.path.exists(db_path):
    print("Database file not found!")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in apparel_erp.db:")
    for t in tables:
        table_name = t[0]
        if table_name == "sqlite_sequence":
            continue
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"  - {table_name}: {count} rows")
    conn.close()
