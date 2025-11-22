#!/bin/bash

# Load environment variables
set -a
source .env.local
set +a

TENANT_ID="recduwNrt9qNPH07h"
BASE_URL="https://api.airtable.com/v0/${AIRTABLE_BASE_ID}"

echo "Creating Salespeople..."

# Patricia Silva
curl -X POST "$BASE_URL/Salespeople" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [{
      "fields": {
        "tenant_id": ["'$TENANT_ID'"],
        "name": "Patricia Silva",
        "phone": "+5511999998888",
        "email": "patricia@loja.com",
        "specialization": "Relógios de luxo",
        "schedule": "Segunda a Sexta: 10h-19h | Sábado: 10h-14h",
        "active": true
      }
    }]
  }'

echo -e "\n\n"

# Ricardo Mendes
curl -X POST "$BASE_URL/Salespeople" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [{
      "fields": {
        "tenant_id": ["'$TENANT_ID'"],
        "name": "Ricardo Mendes",
        "phone": "+5511999997777",
        "email": "ricardo@loja.com",
        "specialization": "Joias e diamantes",
        "schedule": "Terça a Sábado: 11h-20h",
        "active": true
      }
    }]
  }'

echo -e "\n\n"

# Juliana Costa
curl -X POST "$BASE_URL/Salespeople" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [{
      "fields": {
        "tenant_id": ["'$TENANT_ID'"],
        "name": "Juliana Costa",
        "phone": "+5511999996666",
        "email": "juliana@loja.com",
        "specialization": "Relógios vintage e usados",
        "schedule": "Segunda a Sexta: 9h-18h",
        "active": true
      }
    }]
  }'

echo -e "\n\n✅ Salespeople created!"
