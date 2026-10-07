# InvoiceMate

**Simple invoicing. Smarter business.**

A professional invoicing and business management platform for freelancers, small businesses, and independent service providers.

---

## Overview

InvoiceMate is a full-stack web application that provides:

- Invoice creation with multiple professional templates
- Customer and product management
- Payment tracking with partial payment support
- Automatic overdue detection
- Revenue analytics dashboard
- Business reports
- PDF generation and print support
- Dark mode

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Java 21, Spring Boot 3.4.3 |
| Database | H2 (development), MySQL (production) |
| Auth | Spring Security + JWT |
| PDF | OpenPDF |
| Build | Maven |

No frontend frameworks (React, Vue, Angular) or CSS libraries (Bootstrap, Tailwind) are used.

## Features

### Core
- Create, edit, delete, and duplicate invoices
- Add line items with quantity and price
- Automatic subtotal, discount, GST, and grand total calculation
- Four invoice templates (Classic, Modern, Business, Minimal)
- Print and PDF download

### Business Management
- Customer database with invoice history
- Product/service library with saved prices
- Payment recording (Cash, Bank Transfer, UPI, Card)
- Partial payment tracking
- Automatic overdue detection
- Draft invoices with auto-save

### Analytics
- Revenue dashboard with summary cards
- Revenue chart with period filtering
- Invoice health monitoring (paid, pending, overdue)
- Business reports with date and customer filters
- Top customers by revenue

### Extras
- Custom branding (logo, accent color, footer text)
- Payment reminder generator
- WhatsApp message generator (copy-paste, no API)
- Invoice activity timeline
- Recurring invoice setup
- Dark/light mode

## Architecture

```
Frontend (HTML/CSS/JS)
    ↕ fetch() / REST API
Spring Boot (Controllers → Services → Repositories)
    ↕ JPA/Hibernate
H2 / MySQL Database
```

## Database Structure

```
User ─┬─ Customer ── Invoice ─┬─ InvoiceItem
      │                        ├─ Payment
      │                        └─ InvoiceActivity
      ├─ Product
      └─ RecurringInvoice
```

Key relationships:
- Each user owns their customers, products, invoices, and payments
- Each invoice belongs to one customer and contains multiple items
- Payments are recorded against specific invoices
- Invoice status is computed from payment amounts and due date

## API Overview

| Area | Endpoints |
|------|----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Dashboard | `GET /api/dashboard/summary`, `GET /api/dashboard/revenue` |
| Invoices | CRUD at `/api/invoices`, plus `/duplicate`, `/activities`, `/pdf` |
| Customers | CRUD at `/api/customers` |
| Products | CRUD at `/api/products` |
| Payments | `GET /api/payments`, `POST /api/payments` |
| Reports | `GET /api/reports`, `GET /api/reports/top-customers` |
| Settings | `GET/PUT /api/settings/*`, `POST /api/settings/logo` |

All endpoints except `/api/auth/*` require JWT authentication.

## Screenshots

*Screenshots will be added after deployment.*

## Local Setup

### Prerequisites

- **Java 21** — [Download from Adoptium](https://adoptium.net/)
- **Maven** — [Download from Apache Maven](https://maven.apache.org/download.cgi)

No MySQL is needed for development — H2 (embedded database) is used by default.

### Step 1: Clone the repository

```bash
git clone <repository-url>
cd InvoiceMate
```

### Step 2: Start the backend

```bash
cd backend
mvn spring-boot:run
```

The application starts on `http://localhost:8080`.

Spring Boot serves both the API and the frontend files automatically.

### Step 3: Open in browser

Navigate to `http://localhost:8080` in your browser.

Register a new account and start creating invoices.

### H2 Database Console (Development)

Access the H2 console at `http://localhost:8080/h2-console`

- JDBC URL: `jdbc:h2:file:./data/invoicemate`
- Username: `sa`
- Password: (leave empty)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `JWT_SECRET` | JWT signing key | Development default (change in production) |
| `DATABASE_URL` | MySQL JDBC URL (production) | H2 file DB |
| `DATABASE_USER` | MySQL username (production) | `sa` |
| `DATABASE_PASSWORD` | MySQL password (production) | empty |

## Deployment

### Backend (Render / Railway)

1. Push the `backend/` directory to a Git repository
2. Create a new Web Service on Render or Railway
3. Set build command: `cd backend && mvn clean package -DskipTests`
4. Set start command: `java -jar backend/target/invoicemate-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod`
5. Set environment variables: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `JWT_SECRET`

### Frontend (if deploying separately)

The frontend is a static site. Deploy the `frontend/` directory to Vercel or Netlify.

Update the API base URL in `frontend/js/api.js` to point to your backend URL.

### Database

Use a MySQL-compatible cloud database:
- PlanetScale
- Railway MySQL
- AWS RDS
- Any MySQL 8+ provider

## Project Structure

```
InvoiceMate/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── invoices.html
│   ├── create-invoice.html
│   ├── invoice-detail.html
│   ├── customers.html
│   ├── products.html
│   ├── payments.html
│   ├── reports.html
│   ├── settings.html
│   ├── css/
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── dashboard.css
│   │   ├── invoices.css
│   │   ├── invoice-templates.css
│   │   ├── print.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── toast.js
│   │   ├── layout.js
│   │   ├── chart.js
│   │   ├── dashboard.js
│   │   ├── invoices.js
│   │   ├── create-invoice.js
│   │   ├── invoice-detail.js
│   │   ├── customers.js
│   │   ├── products.js
│   │   ├── payments.js
│   │   ├── reports.js
│   │   └── settings.js
│   └── assets/
│       ├── logo.svg
│       └── favicon.svg
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/invoicemate/
│       │   ├── InvoiceMateApplication.java
│       │   ├── config/
│       │   ├── controller/
│       │   ├── service/
│       │   ├── repository/
│       │   ├── model/
│       │   ├── dto/
│       │   └── exception/
│       └── resources/
│           ├── application.properties
│           └── application-prod.properties
├── database/
│   ├── schema.sql
│   └── README.md
└── README.md
```

## Future Improvements

- [ ] Email invoice directly to customer
- [ ] Multi-currency support (USD, EUR, GBP)
- [ ] Expense tracking
- [ ] Profit/loss reports
- [ ] Multi-language support
- [ ] Team/multi-user accounts
- [ ] QuickBooks / Tally integration
- [ ] Mobile app (React Native / Flutter)
- [ ] Automated recurring invoice generation (scheduled job)
- [ ] Invoice template editor (drag and drop)

## License

This project is open source and available for educational and commercial use.
