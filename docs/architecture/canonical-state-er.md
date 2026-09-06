# Canonical State relationships

Key foreign-key paths are shown below. Each domain identity also references
`core.entity`. Optional hierarchy levels and optional source metadata are omitted
for readability; the executable schema is `backend/app/db/schema.py`.

```mermaid
erDiagram
    ENTITY ||--o{ ENTITY_ALIAS : has
    ENTITY ||--o{ EXTERNAL_IDENTITY : resolves_explicitly
    SOURCE ||--o{ RAW_INGEST : originates
    RAW_INGEST ||--o{ EVIDENCE_ITEM : locates
    SOURCE ||--o{ EVIDENCE_ITEM : supports
    EVIDENCE_ITEM ||--o{ ASSERTION : supports
    EVIDENCE_ITEM ||--o{ OBSERVATION : supports
    ENTITY ||--o{ ASSERTION : subject
    ENTITY ||--o{ OBSERVATION : subject
    VARIABLE ||--o{ ASSERTION : types
    VARIABLE ||--o{ OBSERVATION : types
    UNIT ||--o{ VARIABLE : canonical_unit
    ENTITY ||--o{ GEOMETRY_OBSERVATION : located_by
    EVIDENCE_ITEM ||--o{ GEOMETRY_OBSERVATION : supports
    WORLD ||--o{ OBSERVATION : isolates
    WORLD ||--o{ ASSERTION : isolates
    WORLD ||--o{ MODEL_RUN : isolates
    MODEL_DEFINITION ||--o{ MODEL_VERSION : versions
    MODEL_VERSION ||--o{ MODEL_RUN : executes
    MODEL_RUN ||--o{ RUN_INPUT : pins
    MODEL_RUN ||--o{ POSTERIOR_SNAPSHOT : generates
    POSTERIOR_SNAPSHOT ||--o{ SNAPSHOT_INPUT : explains
    OBSERVATION o|--o{ SNAPSHOT_INPUT : measured_input
    ASSERTION o|--o{ SNAPSHOT_INPUT : claimed_input
    POSTERIOR_SNAPSHOT ||--o{ STATE_SNAPSHOT : materializes
    POSTERIOR_SNAPSHOT o|--o{ POSTERIOR_SNAPSHOT : revises
    PARAMETER_DEFINITION ||--o{ PARAMETER_POSTERIOR : defines
    POSTERIOR_SNAPSHOT ||--o{ PARAMETER_POSTERIOR : contains
    STATE_SNAPSHOT ||--o{ INVALIDATION : may_need_recomputation
    STATE_SNAPSHOT ||--o{ DECISION : informs
    STATE_SNAPSHOT ||--o{ MATCH_RUN : supplies
    MATCH_RUN ||--o{ MATCH_CANDIDATE : calculates
    MATCH_CANDIDATE o|--o{ OPPORTUNITY : motivates
    OPPORTUNITY o|--o{ VERIFICATION_TASK : requests
    DECISION o|--o{ VERIFICATION_TASK : requests
    VERIFICATION_TASK ||--o{ VERIFICATION_RESULT : produces
    OBSERVATION ||--o{ VERIFICATION_RESULT : records
```

```mermaid
erDiagram
    ASSET_PORTFOLIO o|--o{ ESTATE : contains
    ESTATE o|--o{ PARCEL : contains
    PARCEL o|--o{ STAND : contains
    STAND o|--o{ PLOT : samples
    PLOT o|--o{ TREE : samples
    TAXON ||--o{ GENETIC_MATERIAL : identifies
    TAXON ||--o{ TAXON_PARENT : hybrid_parent
    GENETIC_MATERIAL o|--o{ STAND : planted_material
    MANAGEMENT_EVENT ||--o| HARVEST_EVENT : specializes
    HARVEST_EVENT o|--o{ LOG : produces
    TREE o|--o{ LOG : origin
    LOG ||--o{ LOG_OBSERVATION : measured_by
    ORGANISATION o|--o{ FACILITY : operates
    FACILITY ||--o{ PROCESSING_LINE : contains
    FACILITY ||--o{ PROCUREMENT_PROGRAMME : sources
    PROCUREMENT_PROGRAMME ||--o{ GRADE_DEFINITION : defines
    TAXON ||--o{ GRADE_DEFINITION : species_scope
    GRADE_DEFINITION ||--o{ PROCESSOR_SPECIFICATION : versioned_requirements
    GRADE_DEFINITION o|--o{ PRICE_OBSERVATION : priced_by
    FACILITY ||--o{ NURSERY_MATERIAL : supplies
    GENETIC_MATERIAL ||--o{ NURSERY_MATERIAL : material
    OPERATOR o|--o{ CREW : operates
    OPERATOR o|--o{ EQUIPMENT : operates
    OPERATOR o|--o{ JOB : performs
    JOB ||--o{ JOB_OBSERVATION : measures
    JOB ||--o{ JOB_EQUIPMENT : uses
    EQUIPMENT ||--o{ JOB_EQUIPMENT : assigned
    ROUTE ||--o{ ROUTE_LEG : ordered_legs
```
