const db = require('../config/db');
const { logger } = require('../config/logger');

/**
 * Execute a single SELECT query
 */
const queryOne = async (sql, params = []) => {
  try {
    const result = await db.query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`queryOne error: ${error.message}`);
    throw error;
  }
};

/**
 * Execute a SELECT query returning all rows
 */
const queryAll = async (sql, params = []) => {
  try {
    const result = await db.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error(`queryAll error: ${error.message}`);
    throw error;
  }
};

/**
 * Execute an INSERT query and return the new row
 */
const insertOne = async (sql, params = []) => {
  try {
    const result = await db.query(sql, params);
    return result.rows[0];
  } catch (error) {
    logger.error(`insertOne error: ${error.message}`);
    throw error;
  }
};

/**
 * Execute an UPDATE query
 */
const updateOne = async (sql, params = []) => {
  try {
    const result = await db.query(sql, params);
    return result.rowCount;
  } catch (error) {
    logger.error(`updateOne error: ${error.message}`);
    throw error;
  }
};

/**
 * Execute a DELETE query
 */
const deleteOne = async (sql, params = []) => {
  try {
    const result = await db.query(sql, params);
    return result.rowCount;
  } catch (error) {
    logger.error(`deleteOne error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  queryOne,
  queryAll,
  insertOne,
  updateOne,
  deleteOne,
};
