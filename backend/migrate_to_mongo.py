import sqlite3
import pymongo
import os
import sys
from dotenv import load_dotenv

# Explicitly load .env file from the current directory
load_dotenv(dotenv_path=".env", override=True)

from app.core.config import settings

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def migrate():
    db_path = "apparel_erp.db"
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        sys.exit(1)

    print(f"Connecting to SQLite database: {db_path}...")
    sqlite_conn = sqlite3.connect(db_path)
    sqlite_conn.row_factory = dict_factory
    sqlite_cursor = sqlite_conn.cursor()

    mongo_uri = os.getenv("MONGODB_URI") or settings.MONGODB_URI
    db_name = os.getenv("MONGODB_DB_NAME") or settings.MONGODB_DB_NAME
    print(f"Connecting to MongoDB Atlas: {mongo_uri} (DB: {db_name})...")
    
    mongo_client = pymongo.MongoClient(mongo_uri)
    mongo_db = mongo_client[db_name]

    tables_to_migrate = [
        ("buyers", "buyer_id"),
        ("suppliers", "supplier_id"),
        ("inventory", "item"),
        ("purchase_orders", "order_id"),
        ("bill_of_materials", "bom_id"),
        ("qc_logs", "log_id"),
        ("production_orders", "production_id"),
        ("shipments", "shipment_id"),
        ("rag_documents", "doc_id"),
        ("email_logs", "email_id"),
        ("ai_tasks", "task_id")
    ]

    total_inserted = 0

    for table_name, key_field in tables_to_migrate:
        try:
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            collection = mongo_db[table_name]
            
            # Clear existing data in MongoDB collection to prevent duplicates
            collection.delete_many({})
            
            if rows:
                clean_rows = [dict(r) for r in rows]
                result = collection.insert_many(clean_rows)
                inserted_count = len(result.inserted_ids)
                total_inserted += inserted_count
                print(f"  [OK] {table_name}: Migrated {inserted_count} document(s)")
            else:
                print(f"  [SKIP] {table_name}: 0 rows found in SQLite")
        except Exception as e:
            print(f"  [ERROR] Error migrating {table_name}: {e}")

    sqlite_conn.close()
    mongo_client.close()
    print(f"\nMigration completed successfully! Total {total_inserted} document(s) pushed to MongoDB Atlas.")

if __name__ == "__main__":
    migrate()
