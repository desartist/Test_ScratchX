# Store Snapshot Pattern - Architecture Diagrams

**Visual Reference for System Design & Data Flow**

---

## 1. Database Schema Architecture

### Before: Separate Collections (Legacy)

```mermaid
erDiagram
    CAMPAIGN ||--o{ CAMPAIGN_STORE_MAPPING : has
    CAMPAIGN_STORE_MAPPING ||--|| STORE : references
    
    CAMPAIGN {
        ObjectId _id
        string campaignName
        Date startDate
        Date endDate
        string status
    }
    
    CAMPAIGN_STORE_MAPPING {
        ObjectId _id
        ObjectId campaign_id
        ObjectId store_id
        int allocated_scratch_cards
        int used_scratch_cards
        Date allocation_date
        string status
    }
    
    STORE {
        ObjectId _id
        string store_name
        string store_code
        string address
        string city
        string state
        string pincode
        decimal latitude
        decimal longitude
        string contact_person
        string contact_number
    }
```

**Problems**:
- ❌ Three separate collections
- ❌ Runtime lookups required
- ❌ Store changes affect campaigns
- ❌ No historical data
- ❌ Delete cascades risk

---

### After: Embedded Snapshots (New Pattern)

```mermaid
erDiagram
    CAMPAIGN {
        ObjectId _id
        string campaignName
        Date startDate
        Date endDate
        string status
        array assignedStores
    }
    
    CAMPAIGN }o--|| STORE_SNAPSHOT : contains
    
    STORE_SNAPSHOT {
        ObjectId storeId
        string storeName
        string storeCode
        string address
        string city
        string state
        string pincode
        decimal latitude
        decimal longitude
        string contactPerson
        string contactNumber
        int allocated_scratch_cards
        int used_scratch_cards
        int redeemed_scratch_cards
        int remaining_scratch_cards
        Date assignedAt
        ObjectId assignedBy
        string status
        Date lastModified
        ObjectId lastModifiedBy
    }
```

**Benefits**:
- ✅ Single document
- ✅ No external lookups
- ✅ Immutable snapshots
- ✅ Complete history
- ✅ No delete risk

---

## 2. Query Optimization: Before vs After

### Campaign Detail Query Flow

#### Before (Legacy - 3 Queries)

```mermaid
graph TD
    A["GET /api/campaigns/{id}"] -->|Query 1| B["Campaign Collection"]
    B -->|campaignId| C["CampaignStoreMapping Collection"]
    C -->|store_id| D["Store Collection"]
    
    B -->|Return| E["Campaign Data"]
    C -->|Return| F["Allocation Data"]
    D -->|Return| G["Store Data"]
    
    E --> H["Combine Results"]
    F --> H
    G --> H
    
    H -->|Response| I["Client"]
    
    style A fill:#e1f5ff
    style H fill:#fff3e0
    style I fill:#c8e6c9
```

**Issues**:
- 3 separate database queries
- Store changes affect display
- Slow response (500-800ms)
- Join operations required

---

#### After (Snapshots - 1 Query)

```mermaid
graph TD
    A["GET /api/campaigns/{id}"] -->|Query 1| B["Campaign Collection"]
    B -->|Complete Data| C["Campaign Document with<br/>Embedded Snapshots"]
    
    C -->|Response| D["Client"]
    
    style A fill:#e1f5ff
    style C fill:#c8e6c9
    style D fill:#a5d6a7
```

**Benefits**:
- Single database query
- All data in one document
- Fast response (<200ms)
- No join operations

---

## 3. Campaign Assignment Flow

### Assignment Process

```mermaid
sequenceDiagram
    participant Merchant as Merchant<br/>(UI)
    participant API as POST /assign<br/>(API)
    participant Service as Campaign<br/>Service
    participant DB as MongoDB
    participant Store as Store<br/>Collection

    Merchant->>API: Click "Assign Stores"<br/>{storeIds: [...], qty: 1000}
    
    API->>Service: assignCampaignToStores()
    
    Service->>DB: Get campaign
    DB-->>Service: campaign
    
    loop For each store
        Service->>Store: Fetch store data
        Store-->>Service: {name, code, address, lat/lon...}
        Service->>Service: Create snapshot
    end
    
    Service->>DB: Update campaign.assignedStores[]
    DB-->>Service: ✓ Updated
    
    Service-->>API: {successful: [...], failed: [...]}
    
    API-->>Merchant: ✓ Stores assigned<br/>Snapshots created
    
    Note over Merchant,DB: Snapshot contains ALL store data<br/>at assignment time (immutable)
```

---

## 4. QR Validation Flow

### Before: Store Collection Lookup

```mermaid
graph TD
    A["Customer Scans QR"] -->|campaignId, storeId| B["POST /api/customer/participate"]
    
    B -->|Query 1| C["Get Campaign"]
    C -->|Response| D["Campaign Data"]
    
    B -->|Query 2| E["Get Store<br/>CURRENT Location"]
    E -->|Response| F["Store at Location B<br/>(may have moved!)"]
    
    G["Customer Location<br/>Location A"] -->|Distance calc| H["Haversine Formula"]
    
    F -->|Store coords| H
    G -->|Customer coords| H
    
    H -->|Distance > 2km?| I{"Within Radius?"}
    
    I -->|NO| J["❌ Validation Failed"]
    I -->|YES| K["✅ Create Participation"]
    
    L["⚠️ PROBLEM:<br/>Store moved but<br/>QR at original location!"]
    
    style E fill:#ffcdd2
    style L fill:#ffcdd2
    style J fill:#ffcdd2
```

---

### After: Snapshot Location

```mermaid
graph TD
    A["Customer Scans QR"] -->|campaignId, storeId| B["POST /api/customer/participate"]
    
    B -->|Query 1| C["Get Campaign<br/>with Snapshots"]
    C -->|Response| D["Campaign Data<br/>+ Embedded Snapshots"]
    
    E["Campaign Snapshot:<br/>Location A<br/>(at assignment time)"] -->|Get from snapshot| F["Store Location A"]
    
    G["Customer Location<br/>Location A"] -->|Distance calc| H["Haversine Formula"]
    
    F -->|Store coords| H
    G -->|Customer coords| H
    
    H -->|Distance > 2km?| I{"Within Radius?"}
    
    I -->|NO| J["❌ Validation Failed"]
    I -->|YES| K["✅ Create Participation"]
    
    L["✅ CORRECT:<br/>Uses historical location<br/>where customer saw QR!"]
    
    style E fill:#c8e6c9
    style L fill:#c8e6c9
    style K fill:#c8e6c9
```

---

## 5. Data Consistency: Store Update Scenario

### Scenario: Store Moves After Campaign Assignment

```mermaid
graph LR
    A["Day 1:<br/>Store at Location A<br/>Campaign Assigned"] -->|Snapshot captures<br/>Location A| B["Campaign Document<br/>with Snapshot"]
    
    B -->|Days later:<br/>Store relocates| C["Store Collection<br/>Location B Updated"]
    
    D["Campaign Snapshot<br/>Still has Location A<br/>(Immutable)"]
    
    C -.->|No impact| D
    
    E["Customer at<br/>Location A<br/>Scans QR"] -->|Uses snapshot<br/>Location A| F["✅ Validates<br/>Correctly"]
    
    style B fill:#c8e6c9
    style D fill:#c8e6c9
    style F fill:#a5d6a7
```

---

## 6. System Architecture Overview

```mermaid
graph TB
    subgraph Client["Client Layer"]
        A1["Frontend:<br/>Campaign Detail"]
        A2["Frontend:<br/>Store Assignment"]
        A3["Mobile:<br/>QR Scanner"]
    end
    
    subgraph API["API Layer"]
        B1["POST /campaigns/[id]/assign"]
        B2["DELETE /campaigns/[id]/stores/[storeId]"]
        B3["GET /campaigns/[id]"]
        B4["POST /customer/participate"]
    end
    
    subgraph Service["Service Layer"]
        C1["assignCampaignToStores()"]
        C2["removeStoreFromCampaign()"]
        C3["getAssignedStoresSnapshot()"]
        C4["verifyCustomerLocationWithSnapshot()"]
    end
    
    subgraph Database["Database Layer"]
        D1["Campaign Collection<br/>(with assignedStores)"]
        D2["Store Collection<br/>(Legacy reference)"]
        D3["CampaignStoreMapping<br/>(Legacy)"]
    end
    
    A1 --> B3
    A2 --> B1
    A3 --> B4
    
    B1 --> C1
    B2 --> C2
    B3 --> C3
    B4 --> C4
    
    C1 --> D1
    C2 --> D1
    C3 --> D1
    C4 --> D1
    
    C1 -.->|Fetch store data| D2
    D3 -.->|Legacy: not used| D1
    
    style D1 fill:#c8e6c9
    style D2 fill:#fff9c4
    style D3 fill:#ffccbc
```

---

## 7. Migration Data Flow

```mermaid
graph TD
    A["Existing Data:<br/>CampaignStoreMapping"] -->|Migration Script| B["Process Each Campaign"]
    
    B -->|For each mapping| C["Fetch Store<br/>Current Data"]
    
    C -->|Create Snapshot| D["Build Snapshot Object<br/>with all fields"]
    
    D -->|Validate| E{"Location Data<br/>Present?"}
    
    E -->|NO| F["⚠️ Skip Store<br/>Log Warning"]
    
    E -->|YES| G["Add to<br/>assignedStores[]"]
    
    G -->|Save| H["Campaign Document<br/>with Snapshots"]
    
    F -->|Continue| B
    
    B -->|All campaigns<br/>processed| I["✅ Migration<br/>Complete"]
    
    J["Legacy Data<br/>Untouched"] -.->|Preserved for<br/>rollback| A
    
    style H fill:#c8e6c9
    style I fill:#a5d6a7
    style A fill:#fff9c4
```

---

## 8. Soft Delete: Status Transitions

```mermaid
graph LR
    A["Assignment<br/>Created"] -->|status: 'active'| B["Active in<br/>Campaign"]
    
    B -->|Merchant clicks<br/>Remove| C["Mark as<br/>status: 'removed'"]
    
    C -->|Soft Delete<br/>No Data Loss| D["Removed from<br/>Active Display"]
    
    E["Historical Data<br/>Preserved"] -.->|Audit Trail<br/>Intact| D
    
    F["Data can be<br/>reversed if<br/>needed"] -.->|Change status<br/>back to 'active'| B
    
    style B fill:#c8e6c9
    style D fill:#fff9c4
    style C fill:#ffccbc
    style E fill:#e1f5ff
    style F fill:#e1f5ff
```

---

## 9. Performance Comparison

### Query Volume Reduction

```mermaid
graph LR
    A["Campaign Detail<br/>Page"] -->|Before| B["3 Queries"]
    A -->|After| C["1 Query"]
    
    D["Campaign List<br/>100 campaigns"] -->|Before| E["100 + Secondary<br/>Queries"]
    D -->|After| F["100 Queries<br/>Only"]
    
    G["Store Assignment"] -->|Before| H["1 Write +<br/>Create Mapping"]
    G -->|After| I["1 Write to<br/>Campaign"]
    
    J["Store Removal"] -->|Before| K["1 Delete<br/>+ Query"]
    J -->|After| L["1 Update<br/>Status"]
    
    style C fill:#c8e6c9
    style F fill:#c8e6c9
    style I fill:#c8e6c9
    style L fill:#c8e6c9
    
    style B fill:#ffccbc
    style E fill:#ffccbc
    style H fill:#ffccbc
    style K fill:#ffccbc
```

---

## 10. Index Strategy

```mermaid
graph TD
    A["Campaign Collection<br/>Indexes"] -->|Index 1| B["assignedStores.storeId"]
    A -->|Index 2| C["assignedStores.status"]
    A -->|Index 3| D["assignedStores.assignedAt"]
    A -->|Index 4| E["merchantId +<br/>assignedStores.status<br/>(Compound)"]
    
    B -->|Fast| B1["Find by store<br/>in campaign"]
    C -->|Fast| C1["Filter active<br/>only"]
    D -->|Fast| D1["Sort by<br/>assignment date"]
    E -->|Fast| E1["Merchant's<br/>campaigns with<br/>active stores"]
    
    style B1 fill:#c8e6c9
    style C1 fill:#c8e6c9
    style D1 fill:#c8e6c9
    style E1 fill:#c8e6c9
```

---

## 11. Backward Compatibility During Migration

```mermaid
graph TD
    A["Phase 1-5:<br/>Deploy Code"] -->|Both patterns<br/>supported| B["Existing Campaigns:<br/>Use CampaignStoreMapping"]
    
    A -->|Both patterns<br/>supported| C["New Campaigns:<br/>Use Snapshots"]
    
    D["Phase 6:<br/>Run Migration<br/>Script"] -->|Convert<br/>existing data| E["All Campaigns:<br/>Have Snapshots"]
    
    E -->|New campaigns| F["Use Snapshots<br/>Exclusively"]
    
    G["Phase 7:<br/>Cleanup"] -->|Remove<br/>legacy| H["Archive<br/>CampaignStoreMapping"]
    
    style B fill:#fff9c4
    style C fill:#c8e6c9
    style E fill:#c8e6c9
    style F fill:#a5d6a7
    style H fill:#a5d6a7
```

---

## 12. API Response Evolution

### Assignment Endpoint Response

```mermaid
graph TD
    A["POST /api/campaigns/[id]/assign"] -->|Success| B["Response 200"]
    A -->|Partial Success| C["Response 207"]
    A -->|Error| D["Response 4xx/5xx"]
    
    B -->|Body| E["successful: [...]<br/>failed: []<br/>summary: {...}"]
    
    C -->|Body| F["successful: [some]<br/>failed: [some]<br/>summary: {...}"]
    
    D -->|Body| G["error: message<br/>data: null"]
    
    E -->|Each successful| E1["storeName<br/>snapshot: {...}<br/>allocated: 1000"]
    
    F -->|Each failed| F1["storeName<br/>error: reason"]
    
    style B fill:#c8e6c9
    style C fill:#fff9c4
    style D fill:#ffccbc
    style E1 fill:#a5d6a7
```

---

## 13. Complete System Integration

```mermaid
graph TB
    subgraph User["👤 User Actions"]
        U1["Merchant Assigns<br/>Stores"]
        U2["Customer Scans<br/>QR Code"]
        U3["Merchant Views<br/>Campaign"]
    end
    
    subgraph API["🔌 API Layer"]
        A1["POST /assign"]
        A2["POST /participate"]
        A3["GET /campaigns/{id}"]
    end
    
    subgraph Service["⚙️ Service Layer"]
        S1["assignCampaignToStores()"]
        S2["verifyCustomerLocationWithSnapshot()"]
        S3["getCampaignDetail()"]
    end
    
    subgraph Data["💾 Data Layer"]
        D1["Campaign Document<br/>with Snapshots"]
    end
    
    U1 -->|Step 1| A1
    U2 -->|Step 2| A2
    U3 -->|Step 3| A3
    
    A1 -->|Create| S1
    A2 -->|Validate| S2
    A3 -->|Read| S3
    
    S1 -->|Fetch stores<br/>Create snapshots<br/>Embed in campaign| D1
    S2 -->|Get snapshot<br/>Calculate distance<br/>Validate| D1
    S3 -->|Return campaign<br/>with snapshots| D1
    
    D1 -->|No Store<br/>Collection<br/>Queries| S2
    D1 -->|Immutable<br/>at assignment<br/>time| S2
    
    style D1 fill:#c8e6c9
    style S1 fill:#bbdefb
    style S2 fill:#bbdefb
    style S3 fill:#bbdefb
```

---

## 14. Error Handling Flow

```mermaid
graph TD
    A["POST /api/customer/participate"] -->|Validation| B{"Campaign<br/>exists?"}
    
    B -->|NO| C1["❌ 404<br/>Campaign not found"]
    B -->|YES| D{"Store in<br/>snapshots?"}
    
    D -->|NO| C2["❌ 404<br/>Store not assigned<br/>or removed"]
    D -->|YES| E{"Location<br/>coordinates?"}
    
    E -->|NO| C3["❌ 400<br/>Store location<br/>missing"]
    E -->|YES| F{"Within<br/>2km?"}
    
    F -->|NO| C4["❌ 400<br/>Outside allowed<br/>radius<br/>Include: distance"]
    F -->|YES| G["✅ 201<br/>Participation<br/>created"]
    
    C1 -->|Return error| H["Client handles<br/>error response"]
    C2 -->|Return error| H
    C3 -->|Return error| H
    C4 -->|Return error| H
    
    G -->|Return<br/>participation| I["Client proceeds<br/>to scratch card"]
    
    style G fill:#c8e6c9
    style C1 fill:#ffccbc
    style C2 fill:#ffccbc
    style C3 fill:#ffccbc
    style C4 fill:#ffccbc
```

---

## Summary

These diagrams illustrate:

1. **Schema Evolution**: From 3 separate collections to 1 embedded document
2. **Query Optimization**: From 3+ queries to 1 single query
3. **Data Flow**: Complete request/response cycles
4. **QR Validation**: Historical accuracy with immutable snapshots
5. **System Architecture**: All components working together
6. **Migration Process**: Non-destructive data conversion
7. **Data Integrity**: Soft delete and audit trail
8. **Performance**: Query reduction and speed improvements
9. **Backward Compatibility**: Gradual migration support
10. **Error Handling**: Comprehensive validation at each step

All diagrams can be rendered using Mermaid (https://mermaid.js.org/) for clear visualization.
