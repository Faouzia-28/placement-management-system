# System Architecture Overview

## Summary
- Total services: 6
- Total connections: 7

## Services
| Name | Image | Exposed | Ports |
| --- | --- | --- | --- |
| postgres | postgres:15-alpine | Yes | 5432:5432 |
| pgadmin | dpage/pgadmin4:latest | Yes | 8080:80 |
| redis | redis:7-alpine | Yes | 6380:6379 |
| backend | None | Yes | 5000:5000 |
| worker | None | No | None |
| scheduler | None | No | None |

## Dependencies
- pgadmin 2 postgres
- backend 2 postgres
- backend 2 redis
- worker 2 postgres
- worker 2 redis
- scheduler 2 postgres
- scheduler 2 redis

## Exposed Services
- postgres exposed on host port 5432
- pgadmin exposed on host port 8080
- redis exposed on host port 6380
- backend exposed on host port 5000

## Diagram
```mermaid
graph TD
    classDef service fill:#e7f0ff,stroke:#9bb7ff,stroke-width:1px,color:#1f2a44;
    classDef exposed fill:#f6ecff,stroke:#c7a7ff,stroke-width:1px,color:#2b1f44;
    postgres((postgres))
    class postgres exposed
    pgadmin((pgadmin))
    class pgadmin exposed
    redis((redis))
    class redis exposed
    backend((backend))
    class backend exposed
    worker([worker])
    class worker service
    scheduler([scheduler])
    class scheduler service
    pgadmin --> postgres
    backend --> postgres
    backend --> redis
    worker --> postgres
    worker --> redis
    scheduler --> postgres
    scheduler --> redis
```
