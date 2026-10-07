# ⚡ InvoiceMate

<div align="center">

[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4.3-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla_JS_%26_CSS3-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Database](https://img.shields.io/badge/Database-H2_%2F_MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**A modern, production-grade billing, invoicing, and tax compliance platform built for freelancers, SMEs, and digital agencies.**

[Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Future AI Roadmap](#-future-ai-roadmap) • [API Documentation](#-api-documentation)

</div>

---

## 🌟 Overview

**InvoiceMate** is a full-stack SaaS platform designed with a clean, high-performance UI ("Invoza" frosted-glass design language) and a robust Java 21 / Spring Boot 3 backend. It eliminates the clunkiness of traditional accounting software with instant WhatsApp dispatch, HSN/SAC code auto-fill, and automated quarterly GST calculations.

Zero frontend dependencies. No massive React node_modules or CSS bloat. Pure semantic HTML5, modern CSS3 variables, and reactive vanilla JavaScript for instantaneous page loads.

---

## ✨ Key Features

### 📄 Invoicing & Estimates
- **Multi-Style Templates**: Switch seamlessly between 4 distinct visual identities:
  - *Modern*: Vibrant royal blue header with sleek technical typography.
  - *Business*: Executive corporate slate with lime accents.
  - *Classic*: Traditional parchment serif ledger design.
  - *Minimal*: Nordic Swiss grid with maximum whitespace.
- **Estimates & Proposals**: Create formal quotes and convert them into live invoices with a single click.
- **Live Split-Screen Preview**: Real-time rendering as you type items, rates, and discounts.
- **HSN / SAC Code Catalog**: Auto-fills tax codes for goods and services to comply with GST regulations.

### 📱 1-Click WhatsApp Invoicing & Reminders
- Dispatch invoices and payment links directly to clients via WhatsApp in one click.
- Pre-composed friendly payment reminders with customizable urgency levels.

### 📊 Indian Tax & GST Compliance (GSTR-1)
- **Quarterly GST Summaries**: Auto-sorts outward supplies across Q1, Q2, Q3, and Q4.
- **Rate-Wise Slabs**: Summarizes 0%, 5%, 12%, 18%, and 28% slabs with CGST and SGST splits.
- **GSTR-1 CSV Export**: Export formatted registers ready for tax advisors and the GST portal.

### 📑 Customer Statement of Account
- Detailed chronological transaction ledger (Invoices, Debits, Credits, Payments).
- Real-time running balance calculator.
- Print and PDF export for client reconciliation.

### 🔁 Recurring Invoices & Payments
- Automate subscription billing (Weekly, Monthly, Quarterly, Annually).
- Multi-method payment recording (UPI, Bank Transfer / NEFT, Cards, Cheque, Cash).
- Partial payment tracking and automatic overdue status transitions.

### 🎨 Invoza Unified Design System
- Atmospheric ambient meadow-sky backdrop with floating frosted glass application container (`backdrop-filter: blur(20px)`).
- Quick keyboard search navigation (`/` shortcut).
- 3D ambient sphere login & registration flow with glass capsule inputs.

---

## 🤖 Future AI Roadmap

InvoiceMate is architected to seamlessly plug into AI services (Gemini, Claude, OpenAI):

1. **Smart Receipt OCR**: Upload raw vendor receipts or photos to extract vendor, line items, and taxes directly into invoices using Gemini Vision.
2. **Conversational Invoice Maker**: Type natural language prompts like *"Invoice John Doe $500 for website design due next Friday"* to generate drafts instantly.
3. **Autonomous Chaser Bot**: Smart tone adaptation (gentle nudge → polite reminder → formal inquiry) based on client payment history.
4. **Cash Flow Predictive Forecasting**: Forecast quarterly revenue and payment delays based on historical customer settlement cycles.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT (BROWSER)                     │
│  Vanilla HTML5 + Modern CSS3 + Invoza Glass Shell      │
│  Interactive Canvas Spline Charts (Chart.js)           │
└───────────────────────────▲────────────────────────────┘
                            │ REST / JSON (fetch API)
┌───────────────────────────▼────────────────────────────┐
│              SPRING BOOT 3.4.3 (JAVA 21)               │
│  ├── Security: Spring Security + JWT Authentication    │
│  ├── Controllers: RESTful API Endpoints                │
│  ├── Services: Invoicing, Tax, PDF, Recurring Engine   │
│  └── Persistence: Spring Data JPA + Hibernate          │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    DATABASE LAYER                      │
│  • Development: Embedded H2 (jdbc:h2:file:./data)       │
│  • Production: MySQL 8+ with Connection Pooling        │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Java 21** or later (OpenJDK or Oracle)
- **Maven 3.9+** (or use bundled Maven)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Quick Run (Zero External Setup Required)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kunj-sampat/InvoiceMate.git
   cd InvoiceMate
   ```

2. **Start the backend server:**
   ```bash
   cd backend
   mvn spring-boot:run
   ```
   *The backend starts automatically at `http://localhost:8080` with an embedded H2 database.*

3. **Launch the application:**
   - Open `frontend/index.html` in your browser for the landing page.
   - Or open `frontend/login.html` to log in / register and access the Invoza Dashboard!

---

## 📂 Project Structure

```
InvoiceMate/
├── backend/
│   ├── src/main/java/com/invoicemate/
│   │   ├── config/          # Security, JWT, Web CORS config
│   │   ├── controller/      # REST API Controllers (10+ resource endpoints)
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── model/           # JPA Entities (User, Invoice, Customer, Payment, etc.)
│   │   ├── repository/      # Spring Data JPA Repositories
│   │   └── service/         # Business logic, GSTR summaries, PDF generation
│   ├── src/main/resources/  # application.properties (H2 & MySQL configs)
│   └── pom.xml              # Maven dependencies
├── frontend/
│   ├── assets/              # SVG logos, branding icons
│   ├── css/                 # Invoza design system, auth.css, invoice-templates.css
│   ├── js/                  # Layout, API interceptors, live preview engines
│   ├── dashboard.html       # Executive analytics & cash flow spline charts
│   ├── invoices.html        # Invoices management & WhatsApp actions
│   ├── estimates.html       # Quotes & proposals generator
│   ├── customers.html       # Client directory
│   ├── customer-statement.html # Account ledgers
│   ├── products.html        # Product/service catalog with HSN/SAC
│   ├── recurring.html       # Subscription billing
│   ├── reports.html         # Quarterly GSTR-1 summaries
│   ├── settings.html        # Business branding & logo uploader
│   ├── create-invoice.html  # Split-screen invoice builder
│   ├── invoice-detail.html  # WhatsApp reminder & payment recording modal
│   ├── login.html           # 3D ambient sphere login
│   ├── register.html        # Glass container registration
│   └── index.html           # Marketing landing page
├── database/                # Production MySQL schemas
├── .env.example             # Secrets & API configuration template
└── .gitignore               # Excludes secrets, binaries, AI models & logs
```

---

## 📡 API Documentation

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/api/auth/register` | Register new business account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET`  | `/api/dashboard/summary` | Revenue, collection rate & health metrics |
| `GET`  | `/api/invoices` | List invoices / estimates (filters: status, type) |
| `POST` | `/api/invoices` | Create new invoice or estimate |
| `GET`  | `/api/invoices/{id}/pdf` | Download formatted PDF invoice |
| `GET`  | `/api/customers/{id}/statement` | Generate chronological customer account statement |
| `GET`  | `/api/reports/gst` | Generate quarterly GSTR-1 tax compliance summary |
| `POST` | `/api/payments` | Record full or partial payment |
| `POST` | `/api/settings/logo` | Upload custom business logo |

---

## 👤 Author

**Kunj Sampat**  
- GitHub: [@kunj-sampat](https://github.com/kunj-sampat)  
- Email: [kunjsam31@gmail.com](mailto:kunjsam31@gmail.com)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
