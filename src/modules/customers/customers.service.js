const db = require('../../config/db');

const getAllCustomers = async () => {
  try {
    const query = 'SELECT id, name, phone, email, pan_number, aadhaar_number, address, created_at, updated_at FROM customers';
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getCustomerById = async (customerId) => {
  try {
    const query = 'SELECT * FROM customers WHERE id = $1';
    const result = await db.query(query, [customerId]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

const createCustomer = async (customerData) => {
  try {
    const query =
      'INSERT INTO customers (name, phone, email, pan_number, aadhaar_number, address, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id';

    const result = await db.query(query, [customerData.name, customerData.phone, customerData.email, customerData.pan_number, customerData.aadhaar_number, customerData.address]);
    return { id: result.rows[0].id, ...customerData };
  } catch (error) {
    throw error;
  }
};

const updateCustomer = async (customerId, customerData) => {
  try {
    const query =
      'UPDATE customers SET name = $1, phone = $2, email = $3, pan_number = $4, aadhaar_number = $5, address = $6, updated_at = NOW() WHERE id = $7 RETURNING id';

    await db.query(query, [customerData.name, customerData.phone, customerData.email, customerData.pan_number, customerData.aadhaar_number, customerData.address, customerId]);
    return { id: customerId, ...customerData };
  } catch (error) {
    throw error;
  }
};

const deleteCustomer = async (customerId) => {
  try {
    const query = 'DELETE FROM customers WHERE id = $1';
    await db.query(query, [customerId]);
    return { success: true };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
