#!/usr/bin/env python3
"""
Fix VerificationSessions State Field
Manually adds missing state options using correct API format
"""

import requests
import json

# Configuration
AIRTABLE_BASE_ID = 'appig3KRYD5neBJqV'
AIRTABLE_API_KEY = 'patX7MHBsdYeVd3zi.41425ee08ed6caa07b4b81ab1960f7b6375073dca879f631524049e5fd553678'
BASE_URL = f'https://api.airtable.com/v0/meta/bases/{AIRTABLE_BASE_ID}/tables'

headers = {
    'Authorization': f'Bearer {AIRTABLE_API_KEY}',
    'Content-Type': 'application/json'
}

def get_all_tables():
    """Fetch all tables and their schemas"""
    response = requests.get(BASE_URL, headers=headers)
    if response.status_code == 200:
        return response.json()['tables']
    else:
        print(f"Error fetching tables: {response.status_code}")
        print(response.text)
        return []

def get_table_by_name(tables, name):
    """Find table by name"""
    return next((t for t in tables if t['name'] == name), None)

def get_field_by_name(table, field_name):
    """Find field by name in table"""
    if not table or 'fields' not in table:
        return None
    return next((f for f in table['fields'] if f['name'] == field_name), None)

def main():
    print("🔧 Fixing VerificationSessions State Options")
    print("=" * 80)

    # Fetch current schema
    tables = get_all_tables()
    verification_sessions_table = get_table_by_name(tables, 'VerificationSessions')

    if not verification_sessions_table:
        print("❌ VerificationSessions table not found.")
        return

    state_field = get_field_by_name(verification_sessions_table, 'state')

    if not state_field:
        print("❌ State field not found.")
        return

    # Get current choices
    current_choices = state_field['options']['choices']
    current_names = [choice['name'] for choice in current_choices]

    print(f"\n📋 Current state options ({len(current_names)}):")
    for name in current_names:
        print(f"   - {name}")

    # Required options
    required_options = [
        'awaiting_cpf',
        'awaiting_watch_info',
        'awaiting_watch_photo',
        'awaiting_guarantee',
        'awaiting_invoice',
        'awaiting_date_explanation',
        'awaiting_optional_docs',
        'processing',
        'completed'
    ]

    # Find missing
    missing = [opt for opt in required_options if opt not in current_names]

    if not missing:
        print("\n✅ All required state options already exist!")
        return

    print(f"\n⚠️  Missing options ({len(missing)}):")
    for name in missing:
        print(f"   - {name}")

    # Build new choices list (keep existing + add new)
    new_choices = current_choices.copy()

    # Add missing choices with color assignments
    colors = ['blueLight2', 'cyanLight2', 'tealLight2', 'greenLight2',
              'yellowLight2', 'orangeLight2', 'redLight2', 'pinkLight2', 'purpleLight2']

    for i, option in enumerate(missing):
        new_choices.append({
            "name": option,
            "color": colors[i % len(colors)]
        })

    print(f"\n🔄 Updating field with {len(new_choices)} total options...")

    # Update the field
    url = f'{BASE_URL}/{verification_sessions_table["id"]}/fields/{state_field["id"]}'

    payload = {
        "options": {
            "choices": new_choices
        }
    }

    response = requests.patch(url, headers=headers, json=payload)

    if response.status_code == 200:
        print("✅ State field updated successfully!")

        updated_field = response.json()
        updated_choices = updated_field['options']['choices']

        print(f"\n📋 Updated state options ({len(updated_choices)}):")
        for choice in updated_choices:
            print(f"   - {choice['name']}")

        print("\n🎉 VerificationSessions state field is now complete!")
    else:
        print(f"❌ Failed to update field")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == '__main__':
    main()
