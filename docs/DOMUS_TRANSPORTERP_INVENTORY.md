# DOMUS ↔ TransportERP: inventory before changing imports

Inspected 2026-10-09 through the authorized GitHub connector.

TransportERP main: d5d603d12177e938d9a227d0247b5c4a86379469.
DOMUS RC1 reference: 30039, evolving additively in domus-3-staging only.

| Existing module | Responsibility to preserve |
| --- | --- |
| transporterp/bank_import_service.py | GenericCsvBankAdapter with explicit column mapping; BankStatementRow; account/company isolation; batch accepted/duplicate/rejected counts; exact and economic fingerprints. XLS/XLSX adapters are expressly future extensions. |
| transporterp/content.py | Plain text and PDF extraction; PDF with OCR fallback; byte-based PDF extraction. |
| transporterp/importer.py | Staged original evidence, SHA-256 ingestion and registry duplicate prevention. |
| transporterp/document_interpretation.py | ONLOGIST autofactura, commission, AXA insurance and RHD settlement interpreters; document_date, transport references and precise amount semantics. |
| transporterp/economic_interpretation_service.py | Projects structured economic facts. RHD batch settlement is evidence of collection, not another economic income. |
| transporterp/settlement_service.py | Batch bank payment, constituent allocations, original document/operation links, accounting settlement and company scope. |

The inspected current tree has no dedicated DOMUS integration module. This is an inventory finding, not a claim that no external/manual exchange exists. DOMUS currently retains source, component_type, transport_number, onlogist_operation_id, invoice_number, movement_links and document links. This UI change does not rename or reconstruct any of those records.

Python/SQLite professional interpretation cannot be imported directly into the static browser application. DOMUS will retain its tested RC1 statement reader and add a guided presentation adapter around it; it will not add a second ONLOGIST/PDF/OCR interpretation engine. Neutral bank field aliases operation_date/description/amount/reference align with TransportERP's existing BankStatementRow. Future XLS/XLSX or professional document processing should extend TransportERP and exchange reviewed structured results, rather than add another browser parser.

Preserve any future exchange's source_system, source_id, source_version, contract_version, document/operation ID, documentary date, expected and actual payment dates, third party, account, economic owner, payer, category, scope, activity, tax detail, transport reference and reconciliation state. They are contract requirements; no new live connector or export format is asserted here. Do not generate new source IDs or round-trip imported records as new records.

The bank import UI must preserve the original CSV string for its existing SHA-256 batch identity. Column mapping is additive metadata, validated by both client and existing Edge Function before the same transactional RPC. Do not convert an already accepted source into a different normalized CSV: doing so would change its batch fingerprint and could duplicate older imports.
