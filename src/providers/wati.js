const axios = require('axios');
const { logger } = require('../config/logger');

const BASE_URL = process.env.WATI_API_URL;
const TOKEN = process.env.WATI_API_TOKEN;

/**
 * Formats Indian phone number to E.164 (91XXXXXXXXXX)
 */
const formatPhone = (phone) => {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('91') && clean.length === 12) return clean;
  if (clean.length === 10) return `91${clean}`;
  return clean;
};

/**
 * Send a plain text WhatsApp message via WATI
 */
const sendMessage = async (phone, message) => {
  try {
    const formatted = formatPhone(phone);

    const response = await axios.post(
      `${BASE_URL}/api/v1/sendSessionMessage/${formatted}`,
      { messageText: message },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`WhatsApp message sent to ${formatted}`);
    return response.data?.id || response.data?.messageId || 'sent';
  } catch (error) {
    logger.error('WATI sendMessage error:', error.response?.data || error.message);
    throw error;
  }
};

// Send a WhatsApp template message (for non-session / 24h window expired)
const sendTemplate = async (phone, templateName, parameters = []) => {
  try {
    const formatted = formatPhone(phone);

    const response = await axios.post(
      `${BASE_URL}/api/v1/sendTemplateMessage`,
      {
        whatsappNumber: formatted,
        template_name: templateName,
        broadcast_name: templateName,
        parameters: parameters.map((value) => ({ name: 'value', value })),
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`WhatsApp template '${templateName}' sent to ${formatted}`);
    return response.data?.id || 'sent';
  } catch (error) {
    logger.error('WATI sendTemplate error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get message status
 */
const getMessageStatus = async (messageId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/v1/getMessageStatus`,
      {
        params: { messageId },
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('WATI getMessageStatus error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get contact details
 */
const getContact = async (phone) => {
  try {
    const formatted = formatPhone(phone);

    const response = await axios.get(
      `${BASE_URL}/api/v1/getContact`,
      {
        params: { whatsappNumber: formatted },
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('WATI getContact error:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  sendMessage,
  sendTemplate,
  getMessageStatus,
  getContact,
  formatPhone,
};
