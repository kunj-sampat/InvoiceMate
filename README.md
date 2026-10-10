<p align="center">
  <a href="https://github.com/kunj-sampat/InvoiceMate">
    <img src="assets/logo.svg" alt="InvoiceMate Logo" width="96" height="96">
  </a>
</p>

<h1 align="center">InvoiceMate.</h1>

<p align="center">
  <strong>Simple Invoicing. Smarter Business. GST Compliant.</strong>
</p>

<p align="center">
  A modern, high-performance financial operating system designed for Indian freelancers, creators, agencies, and small businesses to bill clients cleanly, collect instant scan-to-pay UPI payments, track real net profits, and prepare quarterly GST filings.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-21_LTS-007396?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 21" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.4.3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot 3" />
  <img src="https://img.shields.io/badge/UPI-Instant_QR-008444?style=for-the-badge&logo=googlepay&logoColor=white" alt="UPI Enabled" />
  <img src="https://img.shields.io/badge/GST-HSN_Compliant-2563EB?style=for-the-badge" alt="GST Compliant" />
  <img src="https://img.shields.io/badge/License-MIT-0f172a?style=for-the-badge" alt="License MIT" />
</p>

---

## ⚡ Highlights

* **Dynamic Scan-to-Pay UPI QR Code** — Invoices generate an on-the-fly dynamic UPI QR code pre-filled with the exact payable amount and VPA for instant zero-fee settlement via GPay, PhonePe, and Paytm.
* **4 Designer Invoice Templates** — Switch between *Modern (Royal Blue)*, *Classic (Executive Ledger)*, *Business (Navy & Slate)*, and *Minimal (Swiss Grid)* with pixel-perfect print and PDF rendering.
* **1-Click WhatsApp & PDF Dispatch** — Share professional bills with friendly pre-drafted text directly to customer WhatsApp chats or download styled PDFs.
* **Real Net Profit & Expense Tracker** — Calculate genuine profitability based on actual collected revenue (`Net Profit = Total Collected - Expenses`) with category-wise tracking.
* **CA-Ready GST Tax Summary** — Automatic multi-rate breakdown (0%, 5%, 12%, 18%) with CGST, SGST, IGST splits and 1-click GSTR-1 CSV exports for Chartered Accountants.
* **Recurring Billing & Retainers** — Schedule client retainers with multiple line items, custom discounts, and automated issue cycles (`Daily`, `Weekly`, `Monthly`, `Quarterly`, `Yearly`).
* **Customer Ledgers & Statements** — Provide date-wise statements showing invoices, received payments, debit/credit entries, and live running balances.
* **Estimates & Quotations** — Send quotes and convert accepted proposals into formal invoices in a single click.

---

## 🛠 Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Modern ES6+ JavaScript | Lightweight custom design system with frosted-glass aesthetic, Plus Jakarta Sans typography, and zero heavy framework dependencies. |
| **Backend** | Java 21 & Spring Boot 3.4.3 | Spring Web (REST APIs), Spring Data JPA, Spring Security, OpenPDF (LibrePDF 2.0.3), Jackson. |
| **Security** | JWT (JJWT 0.12.6) & BCrypt | Stateless token-based authentication and secure salted password hashing. |
| **Database** | H2 (Dev) & PostgreSQL / MySQL (Prod) | File-backed H2 engine for local zero-config persistence; production-ready for managed PostgreSQL or MySQL. |
| **Build & Tooling** | Apache Maven 3.9.9 | Standardized build automation and dependency packaging. |

---

## 📁 Project Architecture

```plaintext
InvoiceMate/
├── backend/
│   ├── src/main/java/com/invoicemate/
│   │   ├── config/              # Security, JWT filters, WebMvc & CORS
│   │   ├── controller/          # REST API endpoints (Invoices, Expenses, Reports, etc.)
│   │   ├── dto/                 # Request & Response Data Transfer Objects
│   │   ├── model/               # JPA Entities (User, Invoice, Expense, Customer, etc.)
│   │   ├── repository/          # Spring Data JPA Repositories
│   │   └── service/             # Business logic (PDF generator, GST calculations, Profit, Retainers)
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml                  # Maven dependencies & build definitions
├── frontend/
│   ├── css/                     # Frosted-glass UI theme, layout, variables, responsive design
│   ├── js/                      # Modular client logic (api.js, dashboard.js, invoices.js, etc.)
│   ├── index.html               # Public landing page
│   ├── login.html & register.html
│   ├── dashboard.html           # Main analytics workspace & KPI metrics
│   ├── invoices.html & invoice-detail.html
│   ├── estimates.html           # Quotations & proposals
│   ├── expenses.html            # Category-wise expense tracking & profit overview
│   ├── recurring.html           # Retainers & automated billing schedules
│   ├── customer-statement.html  # Client ledger statement
│   └── reports.html             # GST tax summaries & GSTR-1 CSV exporter
├── assets/                      # Brand assets & SVG logos
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
* **Java Development Kit (JDK) 21** or higher
* **Apache Maven 3.9+**
* A modern web browser

### 1. Clone the Repository
```bash
git clone https://github.com/kunj-sampat/InvoiceMate.git
cd InvoiceMate
```

### 2. Run the Backend
```bash
cd backend
mvn spring-boot:run
```
*The Spring Boot server will start on port `8080`.*

### 3. Open in Browser
Open your browser and navigate to:
```
http://localhost:8080
```
*To access the landing page, register an account, or sign in to the workspace.*

---

## 🔒 Security & Privacy

* **Zero Plaintext Passwords** — Salted and hashed using `BCryptPasswordEncoder`.
* **Stateless Token Authentication** — All API calls require valid signed JSON Web Tokens (`Bearer <token>`).
* **Environment-Isolated Secrets** — Secrets (`JWT_SECRET`, database credentials) are configurable via environment variables without hardcoded production keys.
* **Zero 3rd-Party Tracking** — Your client directory, invoices, and revenue records remain strictly confidential.

---

## 🗺 Roadmap

- [x] Dynamic Scan-to-Pay UPI QR generation
- [x] Multi-item Recurring Retainers with Daily/Monthly frequencies
- [x] GST Tax Summary & 1-Click CA CSV export
- [x] True Net Profit calculation engine
- [ ] Managed PostgreSQL Database integration (Neon / Supabase)
- [ ] Cloudflare CDN, DNS & SSL/TLS protection
- [ ] Google & LinkedIn OAuth 2.0 Sign-In
- [ ] Razorpay & Stripe Payment Gateway automation

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).