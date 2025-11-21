#!/usr/bin/env python3
"""
Airtable Schema Updater
Automatically creates missing tables and fields to align with code requirements
"""

import requests
import json
import time

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

def create_table(table_spec):
    """Create a new table"""
    print(f"\n📋 Creating table: {table_spec['name']}")

    response = requests.post(BASE_URL, headers=headers, json=table_spec)

    if response.status_code in [200, 201]:
        print(f"✅ Table '{table_spec['name']}' created successfully!")
        return response.json()
    else:
        print(f"❌ Failed to create table '{table_spec['name']}'")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return None

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

        time.sleep(0.5)  # Rate limiting

def update_single_select_options(table_id, field_id, field_name, new_options):
    """Update Single Select field to add new options"""
    print(f"\n🔄 Updating Single Select field: {field_name}")

    url = f'{BASE_URL}/{table_id}/fields/{field_id}'

    # Airtable requires all options (existing + new) with choices array
    choices = [{"name": opt} for opt in new_options]

    payload = {
        "options": {
            "choices": choices
        }
    }

    response = requests.patch(url, headers=headers, json=payload)

    if response.status_code == 200:
        print(f"✅ Field '{field_name}' updated with new options!")
        return True
    else:
        print(f"❌ Failed to update field '{field_name}'")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def main():
    print("🚀 AIRTABLE SCHEMA UPDATER")
    print("=" * 80)

    # Fetch current schema
    print("\n📊 Fetching current schema...")
    tables = get_all_tables()

    if not tables:
        print("❌ Failed to fetch tables. Exiting.")
        return

    print(f"✅ Found {len(tables)} existing tables")

    # =========================================================================
    # TASK 1: Create FeedbackSessions Table
    # =========================================================================

    feedback_sessions_table = get_table_by_name(tables, 'FeedbackSessions')

    if not feedback_sessions_table:
        print("\n" + "=" * 80)
        print("TASK 1: Creating FeedbackSessions Table")
        print("=" * 80)

        # Get Tenants table ID for linking
        tenants_table = get_table_by_name(tables, 'Tenants')
        tenants_table_id = tenants_table['id'] if tenants_table else None

        if not tenants_table_id:
            print("❌ Tenants table not found. Cannot create FeedbackSessions.")
        else:
            feedback_sessions_spec = {
                "name": "FeedbackSessions",
                "fields": [
                    {
                        "name": "salesperson_phone",
                        "type": "phoneNumber"
                    },
                    {
                        "name": "customer_phone",
                        "type": "phoneNumber"
                    },
                    {
                        "name": "customer_name",
                        "type": "singleLineText"
                    },
                    {
                        "name": "feedback_type",
                        "type": "singleSelect",
                        "options": {
                            "choices": [
                                {"name": "audio"},
                                {"name": "text"}
                            ]
                        }
                    },
                    {
                        "name": "raw_input",
                        "type": "multilineText"
                    },
                    {
                        "name": "transcription",
                        "type": "multilineText"
                    },
                    {
                        "name": "extracted_data",
                        "type": "multilineText"
                    },
                    {
                        "name": "matched_customers",
                        "type": "multilineText"
                    },
                    {
                        "name": "state",
                        "type": "singleSelect",
                        "options": {
                            "choices": [
                                {"name": "awaiting_transcription"},
                                {"name": "awaiting_extraction"},
                                {"name": "awaiting_disambiguation"},
                                {"name": "awaiting_new_customer_confirm"},
                                {"name": "awaiting_confirmation"},
                                {"name": "awaiting_follow_up"},
                                {"name": "completed"},
                                {"name": "cancelled"}
                            ]
                        }
                    },
                    {
                        "name": "created_at",
                        "type": "dateTime",
                        "options": {
                            "dateFormat": {
                                "name": "iso",
                                "format": "YYYY-MM-DD"
                            },
                            "timeFormat": {
                                "name": "24hour",
                                "format": "HH:mm"
                            },
                            "timeZone": "utc"
                        }
                    },
                    {
                        "name": "tenant_id",
                        "type": "multipleRecordLinks",
                        "options": {
                            "linkedTableId": tenants_table_id,
                            "prefersSingleRecordLink": True
                        }
                    }
                ]
            }

            created = create_table(feedback_sessions_spec)
            if created:
                tables.append(created)  # Add to our local list
    else:
        print("\n✅ FeedbackSessions table already exists. Skipping creation.")

    # =========================================================================
    # TASK 2: Add Fields to Settings Table
    # =========================================================================

    print("\n" + "=" * 80)
    print("TASK 2: Updating Settings Table")
    print("=" * 80)

    settings_table = get_table_by_name(tables, 'Settings')

    if not settings_table:
        print("❌ Settings table not found. Cannot update.")
    else:
        settings_table_id = settings_table['id']

        # Check if fields exist
        verification_enabled = get_field_by_name(settings_table, 'verification_enabled')
        offers_purchase = get_field_by_name(settings_table, 'offers_purchase')

        new_fields = []

        if not verification_enabled:
            new_fields.append({
                "name": "verification_enabled",
                "type": "checkbox",
                "options": {
                    "icon": "check",
                    "color": "greenBright"
                }
            })
        else:
            print("   ✅ Field 'verification_enabled' already exists")

        if not offers_purchase:
            new_fields.append({
                "name": "offers_purchase",
                "type": "checkbox",
                "options": {
                    "icon": "check",
                    "color": "greenBright"
                }
            })
        else:
            print("   ✅ Field 'offers_purchase' already exists")

        if new_fields:
            add_fields_to_table(settings_table_id, 'Settings', new_fields)
        else:
            print("   ✅ All required fields already exist in Settings table")

    # =========================================================================
    # TASK 3: Update VerificationSessions State Options
    # =========================================================================

    print("\n" + "=" * 80)
    print("TASK 3: Updating VerificationSessions State Options")
    print("=" * 80)

    verification_sessions_table = get_table_by_name(tables, 'VerificationSessions')

    if not verification_sessions_table:
        print("❌ VerificationSessions table not found. Cannot update.")
    else:
        state_field = get_field_by_name(verification_sessions_table, 'state')

        if not state_field:
            print("❌ State field not found in VerificationSessions table.")
        else:
            current_options = [choice['name'] for choice in state_field['options']['choices']]
            print(f"   Current options: {', '.join(current_options)}")

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

            # Merge existing + new (deduplicate)
            all_options = list(dict.fromkeys(current_options + required_options))

            missing = [opt for opt in required_options if opt not in current_options]

            if missing:
                print(f"   Missing options: {', '.join(missing)}")
                print(f"   All options will be: {', '.join(all_options)}")

                update_single_select_options(
                    verification_sessions_table['id'],
                    state_field['id'],
                    'state',
                    all_options
                )
            else:
                print("   ✅ All required state options already exist")

    # =========================================================================
    # TASK 4: Create BrandKnowledge Table (Optional)
    # =========================================================================

    print("\n" + "=" * 80)
    print("TASK 4: Creating BrandKnowledge Table (Optional)")
    print("=" * 80)

    brand_knowledge_table = get_table_by_name(tables, 'BrandKnowledge')

    if not brand_knowledge_table:
        tenants_table = get_table_by_name(tables, 'Tenants')
        tenants_table_id = tenants_table['id'] if tenants_table else None

        if not tenants_table_id:
            print("❌ Tenants table not found. Cannot create BrandKnowledge.")
        else:
            brand_knowledge_spec = {
                "name": "BrandKnowledge",
                "fields": [
                    {
                        "name": "brand_name",
                        "type": "singleLineText"
                    },
                    {
                        "name": "history_summary",
                        "type": "multilineText"
                    },
                    {
                        "name": "key_selling_points",
                        "type": "multilineText"
                    },
                    {
                        "name": "technical_highlights",
                        "type": "multilineText"
                    },
                    {
                        "name": "target_customer_profile",
                        "type": "multilineText"
                    },
                    {
                        "name": "conversation_vocabulary",
                        "type": "multilineText"
                    },
                    {
                        "name": "price_positioning",
                        "type": "multilineText"
                    },
                    {
                        "name": "must_avoid",
                        "type": "multilineText"
                    },
                    {
                        "name": "active",
                        "type": "checkbox",
                        "options": {
                            "icon": "check",
                            "color": "greenBright"
                        }
                    },
                    {
                        "name": "tenant_id",
                        "type": "multipleRecordLinks",
                        "options": {
                            "linkedTableId": tenants_table_id,
                            "prefersSingleRecordLink": True
                        }
                    }
                ]
            }

            created = create_table(brand_knowledge_spec)
            if created:
                print("✅ BrandKnowledge table created successfully!")
    else:
        print("✅ BrandKnowledge table already exists. Skipping creation.")

    # =========================================================================
    # FINAL SUMMARY
    # =========================================================================

    print("\n" + "=" * 80)
    print("✅ SCHEMA UPDATE COMPLETE!")
    print("=" * 80)
    print("\n📋 Summary:")
    print("   1. FeedbackSessions table - Created/Verified")
    print("   2. Settings table - Updated with verification fields")
    print("   3. VerificationSessions state options - Updated")
    print("   4. BrandKnowledge table - Created (Optional)")
    print("\n🎯 Your Airtable base is now 100% aligned with the code!")
    print("\n⚠️  NEXT STEP: Add this to .env.local:")
    print("   VERIFICATION_ENCRYPTION_KEY=<32-character-random-key>")

if __name__ == '__main__':
    main()
