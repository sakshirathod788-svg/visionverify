# Project TODO

- [x] Define the VisionVerify analysis data model, visibility rules, and modular inference result contract.
- [x] Build the premium public landing page with hero, methodology, technology, limitations, and clear product entry points.
- [x] Build protected account access and a user workspace with a personal dashboard and clear navigation.
- [x] Build accessible drag-and-drop image selection with client-side format and size validation, preview, removal, and request-state feedback.
- [x] Implement a server-side image analysis adapter that truthfully distinguishes an unavailable model, a demo model, and a connected live model.
- [x] Persist only valid analysis records per signed-in user and enforce private history access at every server query.
- [x] Build searchable, filterable, sortable private history and secure analysis-detail revisit views.
- [x] Present only returned analysis evidence with cautious probabilistic wording, model provenance, and a visible model-status badge.
- [x] Add concise setup and operating documentation, including required ML endpoint environment variables and safety limitations.
- [x] Add and run unit tests for analysis validation, model-state behavior, and private history authorization.
- [x] Verify desktop and mobile rendering, resolve UI or runtime issues, and save a release checkpoint.
- [x] Research and document a legitimate image-forensics model/API integration path that returns genuine model output.
- [x] Connect the server-side inference adapter to the selected real model using secure server-only configuration and exact provider response validation.
- [x] Preserve explicit offline and demo behavior: no prediction, no fabricated score, and an “ML model unavailable — no prediction generated.” status.
- [x] Store and display only genuine inference metadata, including returned prediction, confidence when provided, model identity, timestamp, and provider evidence.
- [x] Update the technology and README documentation with actual provider/model details, source links, processing flow, and evidence-based limitations.
- [x] Add integration-focused tests and verify unavailable-model, authorization, invalid-file, responsive, and live-inference paths without inventing model metrics.
- [x] Separate the actual Sightengine response values from any product-level interpretation in persisted data and every result view.
