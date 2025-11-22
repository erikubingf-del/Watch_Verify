# 📊 Customer Interest Tracking System

## Overview

The system tracks customer interests using a **dual-field approach**:

1. **`interests`** - Last 5 interests (for campaigns & priority)
2. **`interests_all`** - Complete historical record (unlimited)

This allows both **campaign targeting** (focus on recent interests) and **long-term analysis** (customer journey over months/years).

---

## 🎯 Why Two Fields?

### **Problem**:
- **Campaigns need recency**: Target customers interested in Rolex NOW, not 6 months ago
- **Analytics need history**: Understand customer journey, conversion patterns, product popularity over time
- **Salesperson needs context**: See both recent focus AND long-term preferences

### **Solution**:
| Field | Purpose | Limit | Use Case |
|-------|---------|-------|----------|
| `interests` | Recent priorities | **Last 5** | Campaign targeting, visit prep, active leads |
| `interests_all` | Complete history | **Unlimited** | Analytics, customer lifetime value, trend analysis |

---

## 📈 How It Works

### **Example Customer Journey**

#### **Week 1: Initial Contact**
```
Customer: "Quero um Rolex esportivo"
→ AI finds: Submariner, GMT-Master II, Datejust

Database Update:
interests: ["Submariner", "GMT-Master II", "Datejust"]
interests_all: ["Submariner", "GMT-Master II", "Datejust"]
```

#### **Week 2: Adds Jewelry Interest**
```
Customer: "Também quero uma joia para minha esposa"
→ AI finds: Anel Diamante, Cartier Love Bracelet

Database Update:
interests: ["Submariner", "GMT-Master II", "Datejust", "Anel Diamante", "Cartier Love"]
interests_all: ["Submariner", "GMT-Master II", "Datejust", "Anel Diamante", "Cartier Love"]
```
*(Both still same - less than 5 interests)*

#### **Month 2: Shifts to High-End Watches**
```
Customer: "Tenho interesse em Patek Philippe"
→ AI finds: Nautilus 5711, Aquanaut, Calatrava

Database Update:
interests: ["Datejust", "Anel Diamante", "Cartier Love", "Nautilus 5711", "Aquanaut"]
                ↑ Submariner & GMT dropped (oldest)
interests_all: ["Submariner", "GMT-Master II", "Datejust", "Anel Diamante",
                "Cartier Love", "Nautilus 5711", "Aquanaut", "Calatrava"]
                ↑ All 8 interests preserved
```

#### **Month 3: Focuses on Patek Only**
```
Customer: "Quero ver mais opções de Patek"
→ AI finds: Grand Complications, Twenty-4, Golden Ellipse

Database Update:
interests: ["Nautilus 5711", "Aquanaut", "Calatrava", "Grand Complications", "Twenty-4"]
            ↑ ONLY Patek models now (most recent)
interests_all: ["Submariner", "GMT-Master II", "Datejust", "Anel Diamante",
                "Cartier Love", "Nautilus 5711", "Aquanaut", "Calatrava",
                "Grand Complications", "Twenty-4", "Golden Ellipse"]
                ↑ Complete history (11 total)
```

---

## 🎯 Campaign Targeting Use Cases

### **Scenario 1: New Patek Philippe Arrival**

**Query**: Find customers interested in Patek Philippe (recent only)

```sql
Filter: interests CONTAINS "Patek"
```

**Result**: Customer from Month 3 example ✅ (has 5 Patek models in `interests`)

**Why**: Current interest = high conversion probability

---

### **Scenario 2: Rolex Submariner Back in Stock**

**Query**: Find customers who asked about Submariner

```sql
Filter: interests CONTAINS "Submariner"
     OR interests_all CONTAINS "Submariner"
```

**Result**:
- `interests` = No match (Submariner was 3 months ago)
- `interests_all` = Match! ✅

**Campaign Strategy**:
- **Primary target**: `interests` matches (shopping NOW)
- **Secondary target**: `interests_all` matches (showed interest before, might still be interested)

**Message**:
- Primary: "O Submariner que você procurou está disponível! Quer agendar visita?"
- Secondary: "Lembra do Submariner? Temos novidades. Ainda tem interesse?"

---

### **Scenario 3: Inactive Customer Re-Engagement**

**Query**: Customers with no interaction in 60+ days

```sql
Filter: last_interaction < 60 days ago
AND interests_all.length > 3  (showed serious interest)
```

**Campaign**:
- Use `interests_all` to personalize: "Vi que você se interessou por [brands from interests_all]. Temos novos modelos. Quer conhecer?"
- Recency doesn't matter (they're already inactive)

---

## 📊 Analytics Use Cases

### **Customer Lifetime Journey**

**Question**: How do customers progress from entry-level to high-end?

**Data**: `interests_all` field

**Analysis**:
```javascript
// Pseudo-code
customers.forEach(customer => {
  const journey = customer.interests_all

  if (journey.includes("TAG Heuer") && journey.includes("Rolex")) {
    console.log("Upgraded from TAG to Rolex")
  }

  if (journey.includes("Rolex") && journey.includes("Patek Philippe")) {
    console.log("Upgraded from Rolex to Patek")
  }
})
```

**Insight**: "40% of customers start with Rolex, 15% upgrade to Patek within 6 months"

---

### **Product Popularity Trends**

**Question**: Which products are trending this month vs last month?

**Data**: `interests` (current) vs `interests_all` (historical)

**Analysis**:
```javascript
// Current trending
const currentInterests = customers.flatMap(c => c.interests)
const thisMonth = countOccurrences(currentInterests)

// Historical baseline
const allInterests = customers.flatMap(c => c.interests_all)
const allTime = countOccurrences(allInterests)

// Compare
const trending = thisMonth.filter(product =>
  thisMonth[product] / allTime[product] > 1.5  // 50% increase
)
```

**Insight**: "Nautilus popularity up 200% this month (back in stock effect)"

---

### **Cross-Selling Opportunities**

**Question**: What products do customers buy together?

**Data**: `interests_all` + purchase history

**Analysis**:
```javascript
// Find patterns
const watchesAndJewelry = customers.filter(c =>
  c.interests_all.some(i => i.includes("Rolex")) &&
  c.interests_all.some(i => i.includes("Cartier"))
)

console.log(`${watchesAndJewelry.length} customers interested in both watches and jewelry`)
```

**Insight**: "60% of Rolex buyers also ask about Cartier jewelry (gift for spouse)"

---

## 🛠️ Implementation Details

### **Automatic Tracking (Conversation Flow)**

**Location**: [app/api/webhooks/twilio/route.ts:395-442](app/api/webhooks/twilio/route.ts#L395-L442)

```typescript
// Every message with product search results
if (ragContext.relevantProducts.length > 0) {
  const productTitles = ragContext.relevantProducts.slice(0, 3).map(p => p.title)

  // Update interests_all (add new, keep all)
  const updatedInterestsAll = [...currentInterestsAll, ...newInterests]

  // Update interests (last 5 only)
  const updatedInterestsRecent = updatedInterestsAll.slice(-5)

  await atUpdate('Customers', customer.id, {
    interests: updatedInterestsRecent,
    interests_all: updatedInterestsAll,
    last_interaction: new Date().toISOString(),
  })
}
```

### **Booking Flow**

**Location**: [lib/scheduling.ts:286-315](lib/scheduling.ts#L286-L315)

```typescript
// When customer books appointment
const updatedInterestsAll = [...currentInterestsAll, productInterest]
const updatedInterestsRecent = updatedInterestsAll.slice(-5)

await atUpdate('Customers', customer.id, {
  name: customerName,
  interests: updatedInterestsRecent,
  interests_all: updatedInterestsAll,
})
```

---

## 📋 Airtable Schema

### **Customers Table Fields**

| Field | Type | Description |
|-------|------|-------------|
| `interests` | Multiple select / Long text | **Last 5 interests** - For campaigns, visit prep |
| `interests_all` | Multiple select / Long text | **All interests ever** - For analytics, history |
| `phone` | Phone number | WhatsApp number (unique per tenant) |
| `name` | Single line text | Customer name (filled during booking) |
| `tenant_id` | Link to Tenants | Store association |
| `created_at` | Date/time | First contact timestamp |
| `last_interaction` | Date/time | Most recent message |

### **How to Set Up in Airtable**

1. Go to **Customers** table
2. Add field: `interests_all`
   - Type: **Long text** (allows unlimited comma-separated values)
   - OR **Multiple select** (if you prefer structured data)
3. Existing `interests` field stays as-is
4. Both fields populated automatically by code

---

## 🧪 Testing the System

### **Test Scenario: Build Interest History**

**Day 1**: Send WhatsApp message
```
"Quero um Rolex esportivo"
```

**Check Airtable**:
```
interests: ["Submariner", "GMT-Master II"]
interests_all: ["Submariner", "GMT-Master II"]
```

**Day 2**: Send WhatsApp message
```
"Também quero uma joia"
```

**Check Airtable**:
```
interests: ["Submariner", "GMT-Master II", "Anel Diamante"]
interests_all: ["Submariner", "GMT-Master II", "Anel Diamante"]
```

**Day 3-6**: Keep asking about different products (7-8 new products)

**Check Airtable**:
```
interests: [Last 5 products only]
interests_all: [All 10-11 products]
```

---

## 🚀 Phase 2: Campaign Usage

When you implement campaigns, query by `interests` field:

```javascript
// Example: Target customers interested in NEW Rolex arrivals
const campaign = {
  name: "Rolex Submariner Back in Stock",
  target: {
    interests: "CONTAINS 'Submariner'",  // Recent interest
    last_interaction: "> 7 days ago"     // Not spamming active convos
  },
  message: "O Submariner que você procurou está disponível! R$ 58.900. Quer agendar visita?"
}

// Alternatively: Re-engage old leads
const reEngageCampaign = {
  name: "Patek Philippe Enthusiasts",
  target: {
    interests_all: "CONTAINS 'Patek Philippe'",  // Ever showed interest
    last_interaction: "> 60 days ago"             // Inactive
  },
  message: "Novos modelos Patek Philippe chegaram. Gostaria de conhecer?"
}
```

---

## 📈 Success Metrics

### **Interest Tracking Effectiveness**

- **Coverage**: % of customers with interests tracked (target: >80%)
- **Recency**: Avg days since last interest update (target: <14 days)
- **Depth**: Avg number of interests per customer (target: 3-5)

### **Campaign Performance**

- **Open Rate**: interests (recent) vs interests_all (historical)
- **Conversion**: Targeted by recent interest → Visit → Purchase
- **Relevance**: Click-through rate on product links

---

## 💡 Pro Tips

### **1. Use Recent for Urgency**
Target `interests` when you have limited stock or time-sensitive offers.

### **2. Use Historical for Long-Term Value**
Target `interests_all` for brand launches, VIP events, or re-engagement.

### **3. Combine Both**
Primary: `interests` (hot leads)
Secondary: `interests_all` excluding `interests` (warm leads)

### **4. Segment by Depth**
- `interests_all.length > 10` = Serious shopper (multiple visits)
- `interests_all.length < 3` = Early-stage (nurture needed)

---

**Ready to target customers with precision!** 🎯

*Generated with [Claude Code](https://claude.com/claude-code) - Watch Verify CRM Documentation*
