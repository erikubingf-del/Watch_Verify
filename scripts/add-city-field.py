#!/usr/bin/env python3
"""
Add city field to Customers table
"""

import requests

# Configuration
AIRTABLE_BASE_ID = 'appig3KRYD5neBJqV'
AIRTABLE_API_KEY = 'patX7MHBsdYeVd3zi.41425ee08ed6caa07b4b81ab1960f7b6375073dca879f631524049e5fd553678'
BASE_URL = f'https://api.airtable.com/v0/meta/bases/{AIRTABLE_BASE_ID}/tables'

headers = {
    'Authorization': f'Bearer {AIRTABLE_API_KEY}',
    'Content-Type': 'application/json'
}

def get_all_tables():
    """Fetch all tables"""
    response = requests.get(BASE_URL, headers=headers)
    if response.status_code == 200:
        return response.json()['tables']
    return []

def get_table_by_name(tables, name):
    """Find table by name"""
    return next((t for t in tables if t['name'] == name), None)

def get_field_by_name(table, field_name):
    """Find field by name in table"""
    if not table or 'fields' not in table:
        return None
    return next((f for f in table['fields'] if f['name'] == field_name), None)

def add_fields_to_table(table_id, table_name, fields):
    """Add fields to existing table"""
    print(f"\n📝 Adding fields to table: {table_name}")

    url = f'{BASE_URL}/{table_id}/fields'

    for field in fields:
        print(f"   Adding field: {field['name']}")
        response = requests.post(url, headers=headers, json=field)

        if response.status_code in [200, 201]:
            print(f"   ✅ Field '{field['name']}' added successfully!")
        else:
            print(f"   ❌ Failed to add field '{field['name']}'")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")

def main():
    print("🌆 Adding City Field to Customers Table")
    print("=" * 80)

    # Fetch current schema
    print("\n📊 Fetching current schema...")
    tables = get_all_tables()

    if not tables:
        print("❌ Failed to fetch tables. Exiting.")
        return

    # Find Customers table
    customers_table = get_table_by_name(tables, 'Customers')

    if not customers_table:
        print("❌ Customers table not found.")
        return

    print(f"✅ Found Customers table (ID: {customers_table['id']})")

    # Check if city field exists
    city_field = get_field_by_name(customers_table, 'city')

    if city_field:
        print("\n✅ City field already exists in Customers table!")
        print(f"   Field ID: {city_field['id']}")
        print(f"   Field Type: {city_field['type']}")
        return

    # Add city field
    print("\n📍 Adding city field...")

    new_fields = [
        {
            "name": "city",
            "type": "singleLineText"
        }
    ]

    add_fields_to_table(customers_table['id'], 'Customers', new_fields)

    print("\n" + "=" * 80)
    print("✅ COMPLETE!")
    print("\nCity field added to Customers table.")
    print("Now customers can be matched more accurately by city!")

if __name__ == '__main__':
    main()
