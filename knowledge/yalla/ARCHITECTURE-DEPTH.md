# Architecture Depth

Use this vocabulary during planning, review, and audits.

## Terms

- Module: anything with an interface and implementation.
- Interface: everything callers must know to use the module correctly, including invariants, ordering, errors, config, and performance.
- Implementation: code behind the interface.
- Seam: a place where behavior can vary without editing the caller.
- Adapter: a concrete thing satisfying an interface at a seam.
- Depth: leverage at the interface. Deep modules hide lots of behavior behind a small interface.
- Locality: change, bugs, knowledge, and tests concentrate in one place.

Avoid substituting vague words like component, service, API, or boundary when the above terms are more precise.

## Review Questions

- Is this module shallow: interface nearly as complex as implementation?
- Would deleting it remove complexity or spread complexity across callers?
- Does the interface expose implementation details just to make tests possible?
- Is the seam real? Two adapters justify a seam; one adapter is usually hypothetical indirection.
- Does the change improve locality, or scatter the same rule across files?
- Are tests crossing the same interface that callers use?

## Dependency Categories

- In-process: pure computation or local memory. Deepen directly.
- Local-substitutable: database/filesystem with test substitutes. Use local substitute in tests.
- Remote but owned: use a port with production and in-memory adapters.
- True external: inject a narrow port and mock only that boundary.
