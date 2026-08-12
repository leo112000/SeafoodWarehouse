# Architecture

## Backend
Technology:
- ASP.NET Core
- ABP Framework
- Entity Framework Core
- SQL Server

Layers:
Web -> Application -> Domain -> Infrastructure -> Database

---

## Application Layer
Responsibilities:
- Use cases
- DTOs
- Application services
- Authorization
- Validation

Controllers should remain thin. Business logic must not be placed inside controllers.

---

## Domain Layer
Responsibilities:
- Entities
- Domain rules
- Domain services
- Domain events

---

## Infrastructure
Responsibilities:
- EF Core
- Repositories
- External services
- Redis
- Payment providers

---

## Frontend
Technology:
- React
- TypeScript
- Ant Design

Structure:
pages/ | components/ | hooks/ | services/ | stores/ | types/ | utils/

API communication belongs inside services.
Business logic should not be placed directly inside JSX.
