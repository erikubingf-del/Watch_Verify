#!/bin/bash

set -a
source .env.local
set +a

TENANT_ID="recduwNrt9qNPH07h"
BASE_URL="https://api.airtable.com/v0/${AIRTABLE_BASE_ID}"

echo "Creating Catalog Products..."

# Rolex Submariner
echo "1. Rolex Submariner..."
curl -s -X POST "$BASE_URL/Catalog" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [{
      "fields": {
        "tenant_id": ["'$TENANT_ID'"],
        "title": "Rolex Submariner Date 126610LN",
        "brand": "Rolex",
        "category": "Relógios",
        "description": "Rolex Submariner Date em aço com mostrador preto. Movimento Calibre 3235, resistência a 300m. Estado de novo, com caixa e papéis.",
        "price": 58900,
        "stock_quantity": 1,
        "tags": "rolex, submariner, mergulho, aço, preto",
        "active": true
      }
    }]
  }' | jq -r '.records[0].id // "Error"'

# Rolex Datejust
echo "2. Rolex Datejust..."
curl -s -X POST "$BASE_URL/Catalog" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [{
      "fields": {
        "tenant_id": ["'$TENANT_ID'"],
        "title": "Rolex Datejust 41 Azul Jubilee",
        "brand": "Rolex",
        "category": "Relógios",
        "description": "Rolex Datejust 41mm aço e ouro branco. Mostrador azul com índices romanos. Pulseira Jubilee. Perfeito para uso executivo.",
        "price": 52000,
        "stock_quantity": 2,
        "tags": "rolex, datejust, azul, executivo",
        "active": true
      }
    }]
  }' | jq -r '.records[0].id // "Error"'

# Patek Philippe Nautilus
echo "3. Patek Philippe Nautilus..."
curl -s -X POST "$BASE_URL/Catalog" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [{
      "fields": {
        "tenant_id": ["'$TENANT_ID'"],
        "title": "Patek Philippe Nautilus 5711/1A Usado",
        "brand": "Patek Philippe",
        "category": "Relógios",
        "description": "RARIDADE! Patek Philippe Nautilus 5711 descontinuado. Aço com mostrador azul. Ano 2019, estado 95%. Oportunidade única!",
        "price": 320000,
        "stock_quantity": 1,
        "tags": "patek, nautilus, investimento, raro",
        "active": true
      }
    }]
  }' | jq -r '.records[0].id // "Error"'

# Diamond Ring
echo "4. Anel Diamante 1.0ct..."
curl -s -X POST "$BASE_URL/Catalog" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [{
      "fields": {
        "tenant_id": ["'$TENANT_ID'"],
        "title": "Anel Solitário Diamante 1.0ct D/VVS2",
        "brand": "Diamante",
        "category": "Joias",
        "description": "Anel solitário com diamante 1ct, cor D (incolor), pureza VVS2. Certificado GIA. Ouro 18k branco. Perfeito para noivado.",
        "price": 48000,
        "stock_quantity": 1,
        "tags": "diamante, noivado, GIA, solitário",
        "active": true
      }
    }]
  }' | jq -r '.records[0].id // "Error"'

# Cartier Love Bracelet
echo "5. Cartier Love Bracelet..."
curl -s -X POST "$BASE_URL/Catalog" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "records": [{
      "fields": {
        "tenant_id": ["'$TENANT_ID'"],
        "title": "Cartier Love Bracelet Ouro Rosa Diamantes",
        "brand": "Cartier",
        "category": "Joias",
        "description": "Love Bracelet Cartier em ouro rosa 18k com 10 diamantes. Inclui chave e certificado Cartier.",
        "price": 72000,
        "stock_quantity": 1,
        "tags": "cartier, love, ouro rosa, diamantes",
        "active": true
      }
    }]
  }' | jq -r '.records[0].id // "Error"'

echo -e "\n✅ Catalog products created!"
