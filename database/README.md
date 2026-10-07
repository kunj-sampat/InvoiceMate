# Database Setup

InvoiceMate uses **H2** (embedded) for development and **MySQL** for production.

## Development (H2)

No setup required. The H2 database is created automatically when the application starts.

- Database file: `backend/data/invoicemate.mv.db`
- Console: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./data/invoicemate`
- Username: `sa`
- Password: (empty)

JPA/Hibernate automatically creates all tables from the entity classes.

## Production (MySQL)

### 1. Install MySQL 8+

### 2. Create the database

```sql
CREATE DATABASE invoicemate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'invoicemate'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON invoicemate.* TO 'invoicemate'@'%';
FLUSH PRIVILEGES;
```

### 3. Set environment variables

```bash
export DATABASE_URL=jdbc:mysql://localhost:3306/invoicemate
export DATABASE_USER=invoicemate
export DATABASE_PASSWORD=your_secure_password
```

### 4. Run with production profile

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

Or when running the JAR:

```bash
java -jar target/invoicemate-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

## Schema Reference

The `schema.sql` file contains the complete DDL for reference. In practice, JPA handles table creation automatically via `spring.jpa.hibernate.ddl-auto=update`.

## Entity Relationships

```
User (1) ──── (N) Customer
User (1) ──── (N) Product
User (1) ──── (N) Invoice
User (1) ──── (N) RecurringInvoice

Customer (1) ── (N) Invoice

Invoice (1) ──── (N) InvoiceItem
Invoice (1) ──── (N) Payment
Invoice (1) ──── (N) InvoiceActivity

Product (1) ──── (N) InvoiceItem  (optional reference)
```
