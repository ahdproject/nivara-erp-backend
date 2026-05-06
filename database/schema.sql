-- Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plot_number VARCHAR(100),
  sector_location VARCHAR(200),
  total_plot_area DECIMAL(12, 2),
  area_unit VARCHAR(20) DEFAULT 'sqft',
  total_floors INTEGER,
  total_flats INTEGER,
  project_status VARCHAR(50) DEFAULT 'upcoming',
  launch_date DATE,
  expected_completion DATE,
  description TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Configurations Table
CREATE TABLE project_configurations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  config_type VARCHAR(100),
  bhk INTEGER,
  area DECIMAL(10, 2),
  price DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Flats Table
CREATE TABLE flats (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  flat_number VARCHAR(50) NOT NULL,
  floor INTEGER,
  configuration VARCHAR(50),
  area_unit VARCHAR(20),
  carpet_area DECIMAL(10, 2),
  saleable_area DECIMAL(10, 2),
  facing VARCHAR(50),
  parking VARCHAR(100),
  remarks TEXT,
  base_price DECIMAL(15, 2),
  total_price DECIMAL(15, 2),
  price DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, flat_number)
);

-- Customers Table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  pan_number VARCHAR(20),
  aadhaar_number VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brokers Table
CREATE TABLE brokers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  company VARCHAR(255),
  rera_number VARCHAR(50),
  commission_percent DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  flat_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  broker_id INTEGER,
  booking_amount DECIMAL(15, 2),
  agreement_value DECIMAL(15, 2),
  final_value DECIMAL(15, 2),
  discount DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (flat_id) REFERENCES flats(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (broker_id) REFERENCES brokers(id)
);

-- Payment Schedules Table
CREATE TABLE payment_schedules (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL,
  milestone VARCHAR(100),
  amount DECIMAL(15, 2),
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Payments Table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL,
  amount DECIMAL(15, 2),
  payment_type VARCHAR(50) DEFAULT 'booking',
  payment_mode VARCHAR(50) DEFAULT 'cheque',
  reference_number VARCHAR(100),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Broker Commissions Table
CREATE TABLE broker_commissions (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL,
  booking_id INTEGER NOT NULL,
  commission_amount DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'pending',
  paid_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (broker_id) REFERENCES brokers(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Expense Categories Table
CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Expenses Table
CREATE TABLE project_expenses (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  amount DECIMAL(15, 2),
  vendor VARCHAR(255),
  gst DECIMAL(5, 2) DEFAULT 0,
  description TEXT,
  expense_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);

-- Documents Table
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER,
  customer_id INTEGER,
  project_id INTEGER,
  doc_type VARCHAR(50),
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  mime_type VARCHAR(50),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Notification Log Table
CREATE TABLE notification_log (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER,
  notification_type VARCHAR(50),
  channel VARCHAR(50) DEFAULT 'email',
  recipient VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Create Indexes for better performance
CREATE INDEX idx_flats_project ON flats(project_id);
CREATE INDEX idx_flats_status ON flats(status);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_flat ON bookings(flat_id);
CREATE INDEX idx_bookings_project ON bookings(project_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payment_schedules_booking ON payment_schedules(booking_id);
CREATE INDEX idx_broker_commissions_broker ON broker_commissions(broker_id);
CREATE INDEX idx_documents_booking ON documents(booking_id);
CREATE INDEX idx_notification_log_booking ON notification_log(booking_id);
