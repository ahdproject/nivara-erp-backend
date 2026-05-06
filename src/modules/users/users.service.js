const db = require('../../config/db');
const bcrypt = require('bcryptjs');

const getAllUsers = async () => {
  try {
    const query = 'SELECT id, email, name, role, created_at, updated_at FROM users';
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getUserById = async (userId) => {
  try {
    const query = 'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

const createUser = async (userData) => {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const query =
      'INSERT INTO users (email, password, name, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id';

    const result = await db.query(query, [userData.email, hashedPassword, userData.name, userData.role]);
    return { id: result.rows[0].id, ...userData, password: undefined };
  } catch (error) {
    throw error;
  }
};

const updateUser = async (userId, userData) => {
  try {
    let query = 'UPDATE users SET ';
    let params = [];
    const updateFields = [];
    let paramIndex = 1;

    if (userData.name) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(userData.name);
    }
    if (userData.email) {
      updateFields.push(`email = $${paramIndex++}`);
      params.push(userData.email);
    }
    if (userData.role) {
      updateFields.push(`role = $${paramIndex++}`);
      params.push(userData.role);
    }
    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      updateFields.push(`password = $${paramIndex++}`);
      params.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return { id: userId };
    }

    updateFields.push(`updated_at = NOW()`);
    query += updateFields.join(', ') + ` WHERE id = $${paramIndex}`;
    params.push(userId);

    await db.query(query, params);
    return { id: userId, ...userData, password: undefined };
  } catch (error) {
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    const query = 'DELETE FROM users WHERE id = $1';
    await db.query(query, [userId]);
    return { success: true };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
