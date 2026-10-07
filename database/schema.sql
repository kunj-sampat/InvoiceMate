-- =============================================================
-- InvoiceMate Database Schema (Reference Only)
-- 
-- JPA/Hibernate creates these tables automatically.
-- This file is provided for documentation and manual setup.
-- =============================================================

-- Users table
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    business_address TEXT,
    business_phone VARCHAR(50),
    business_email VARCHAR(255),
    logo_path VARCHAR(500),
    invoice_prefix VARCHAR(20) DEFAULT 'INV',
    next_invoice_number INT DEFAULT 1,
    default_gst DOUBLE DEFAULT 18.0,
    default_payment_terms_days INT DEFAULT 30,
    default_notes TEXT,
    accent_color VARCHAR(20) DEFAULT '#1e40af',
    invoice_heading VARCHAR(255) DEFAULT 'INVOICE',
    footer_text TEXT,
    payment_instructions TEXT,
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Products / Services table
CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DOUBLE NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Invoices table
CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DOUBLE DEFAULT 0,
    discount_percent DOUBLE DEFAULT 0,
    discount_amount DOUBLE DEFAULT 0,
    gst_percent DOUBLE DEFAULT 0,
    gst_amount DOUBLE DEFAULT 0,
    grand_total DOUBLE DEFAULT 0,
    amount_paid DOUBLE DEFAULT 0,
    status VARCHAR(30) DEFAULT 'PENDING',
    template VARCHAR(30) DEFAULT 'modern',
    notes TEXT,
    is_draft BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Invoice line items
CREATE TABLE invoice_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    product_id BIGINT,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DOUBLE NOT NULL DEFAULT 0,
    total DOUBLE NOT NULL DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Payment records
CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    amount DOUBLE NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Invoice activity / audit trail
CREATE TABLE invoice_activities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Recurring invoice configuration
CREATE TABLE recurring_invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    next_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    template_data TEXT,
    notes TEXT,
    gst_percent DOUBLE DEFAULT 18.0,
    discount_percent DOUBLE DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Indexes for common queries
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_invoice_activities_invoice_id ON invoice_activities(invoice_id);
CREATE INDEX idx_recurring_invoices_user_id ON recurring_invoices(user_id);
