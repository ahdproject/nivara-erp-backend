const db      = require('../../config/db');
const mailer  = require('../../providers/mailer');
const wati    = require('../../providers/wati');
const templates = require('../../providers/notification.templates');

// ══════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ══════════════════════════════════════════════════════════════

// Dispatch to one or both channels and log result
const dispatch = async ({ channel, type, booking_id, customer_id, schedule_id,
                           recipient_name, recipient_phone, recipient_email,
                           message, html, subject, sent_by }) => {

  const results = [];

  if ((channel === 'whatsapp' || channel === 'both') && recipient_phone) {
    try {
      const ref = await wati.sendMessage(recipient_phone, message);
      results.push(await logNotification({
        booking_id, customer_id, schedule_id,
        channel: 'whatsapp', type,
        recipient_name, recipient_phone, recipient_email,
        message, status: 'sent', provider_ref: ref, sent_by,
      }));
    } catch (err) {
      results.push(await logNotification({
        booking_id, customer_id, schedule_id,
        channel: 'whatsapp', type,
        recipient_name, recipient_phone, recipient_email,
        message, status: 'failed', error_message: err.message, sent_by,
      }));
    }
  }

  if ((channel === 'email' || channel === 'both') && recipient_email) {
    try {
      const ref = await mailer.sendMail({ to: recipient_email, subject, html });
      results.push(await logNotification({
        booking_id, customer_id, schedule_id,
        channel: 'email', type,
        recipient_name, recipient_phone, recipient_email,
        message: subject, status: 'sent', provider_ref: ref, sent_by,
      }));
    } catch (err) {
      results.push(await logNotification({
        booking_id, customer_id, schedule_id,
        channel: 'email', type,
        recipient_name, recipient_phone, recipient_email,
        message: subject, status: 'failed', error_message: err.message, sent_by,
      }));
    }
  }

  return results;
};

const logNotification = async ({
  booking_id, customer_id, schedule_id,
  channel, type, recipient_name,
  recipient_phone, recipient_email,
  message, status, provider_ref, error_message, sent_by,
}) => {
  const { rows } = await db.query(
    `INSERT INTO notification_log
       (booking_id, customer_id, schedule_id, channel, type,
        recipient_name, recipient_phone, recipient_email,
        message, status, provider_ref, error_message, sent_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      booking_id   || null,
      customer_id  || null,
      schedule_id  || null,
      channel, type,
      recipient_name  || null,
      recipient_phone || null,
      recipient_email || null,
      message, status,
      provider_ref    || null,
      error_message   || null,
      sent_by,
    ]
  );
  return rows[0];
};

// Fetch full booking + customer context from DB
const getBookingContext = async (booking_id) => {
  const { rows } = await db.query(
    `SELECT
       b.id              AS booking_id,
       b.booking_date,
       b.final_value,
       b.status          AS booking_status,
       p.name            AS project_name,
       f.flat_number,
       f.floor,
       f.configuration,
       c.id              AS customer_id,
       c.name            AS customer_name,
       c.phone           AS customer_phone,
       c.email           AS customer_email,
       COALESCE(SUM(py.amount), 0)                   AS total_paid,
       b.final_value - COALESCE(SUM(py.amount), 0)   AS balance_due
     FROM bookings  b
     JOIN projects  p  ON p.id = b.project_id
     JOIN flats     f  ON f.id = b.flat_id
     JOIN customers c  ON c.id = b.customer_id
     LEFT JOIN payments py ON py.booking_id = b.id
     WHERE b.id = $1
     GROUP BY b.id, p.name, f.flat_number, f.floor, f.configuration,
              c.id, c.name, c.phone, c.email`,
    [booking_id]
  );
  if (!rows[0]) throw Object.assign(new Error('Booking not found'), { status: 404 });
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// PAYMENT RECEIPT NOTIFICATION
// ══════════════════════════════════════════════════════════════

const sendPaymentReceipt = async ({ booking_id, payment_id, channel = 'both' }, sent_by) => {
  const ctx = await getBookingContext(booking_id);

  // Fetch the specific payment
  const { rows: payRows } = await db.query(
    `SELECT * FROM payments WHERE id = $1 AND booking_id = $2`,
    [payment_id, booking_id]
  );
  if (!payRows[0]) throw Object.assign(new Error('Payment not found'), { status: 404 });
  const payment = payRows[0];

  const message = templates.whatsapp.paymentReceipt(ctx, payment);
  const html    = templates.email.paymentReceipt(ctx, payment);
  const subject = `Payment Receipt — ₹${Number(payment.amount).toLocaleString('en-IN')} received | ${ctx.project_name}`;

  return dispatch({
    channel, type: 'payment_receipt',
    booking_id, customer_id: ctx.customer_id,
    recipient_name:  ctx.customer_name,
    recipient_phone: ctx.customer_phone,
    recipient_email: ctx.customer_email,
    message, html, subject, sent_by,
  });
};

// ══════════════════════════════════════════════════════════════
// PAYMENT REMINDER NOTIFICATION
// ══════════════════════════════════════════════════════════════

const sendPaymentReminder = async ({ booking_id, schedule_id, channel = 'both' }, sent_by) => {
  const ctx = await getBookingContext(booking_id);

  const { rows: schedRows } = await db.query(
    `SELECT * FROM payment_schedules WHERE id = $1 AND booking_id = $2`,
    [schedule_id, booking_id]
  );
  if (!schedRows[0]) throw Object.assign(new Error('Payment schedule not found'), { status: 404 });
  const schedule = schedRows[0];

  const message = templates.whatsapp.paymentReminder(ctx, schedule);
  const html    = templates.email.paymentReminder(ctx, schedule);
  const subject = `Payment Reminder — ${schedule.milestone} due | ${ctx.project_name}`;

  return dispatch({
    channel, type: 'payment_reminder',
    booking_id, customer_id: ctx.customer_id,
    schedule_id,
    recipient_name:  ctx.customer_name,
    recipient_phone: ctx.customer_phone,
    recipient_email: ctx.customer_email,
    message, html, subject, sent_by,
  });
};

// ══════════════════════════════════════════════════════════════
// BOOKING CONFIRMATION NOTIFICATION
// ══════════════════════════════════════════════════════════════

const sendBookingConfirmation = async ({ booking_id, channel = 'both' }, sent_by) => {
  const ctx = await getBookingContext(booking_id);

  const message = templates.whatsapp.bookingConfirmed(ctx);
  const html    = templates.email.bookingConfirmed(ctx);
  const subject = `Booking Confirmed — ${ctx.flat_number}, ${ctx.project_name}`;

  return dispatch({
    channel, type: 'booking_confirmed',
    booking_id, customer_id: ctx.customer_id,
    recipient_name:  ctx.customer_name,
    recipient_phone: ctx.customer_phone,
    recipient_email: ctx.customer_email,
    message, html, subject, sent_by,
  });
};

// ══════════════════════════════════════════════════════════════
// BULK OVERDUE ALERTS — all overdue schedules in one call
// ══════════════════════════════════════════════════════════════

const sendOverdueAlerts = async ({ project_id, channel = 'whatsapp' }, sent_by) => {
  const conditions = [
    `ps.due_date < CURRENT_DATE`,
    `ps.is_paid = FALSE`,
    `b.status != 'cancelled'`,
  ];
  const params = [];
  if (project_id) { conditions.push(`b.project_id = $1`); params.push(project_id); }

  const { rows: overdue } = await db.query(
    `SELECT
       ps.id          AS schedule_id,
       ps.milestone,
       ps.due_date,
       ps.amount_due,
       b.id           AS booking_id,
       p.name         AS project_name,
       f.flat_number,
       c.id           AS customer_id,
       c.name         AS customer_name,
       c.phone        AS customer_phone,
       c.email        AS customer_email,
       CURRENT_DATE - ps.due_date AS days_overdue
     FROM payment_schedules ps
     JOIN bookings  b ON b.id = ps.booking_id
     JOIN projects  p ON p.id = b.project_id
     JOIN flats     f ON f.id = b.flat_id
     JOIN customers c ON c.id = b.customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ps.due_date ASC`,
    params
  );

  let sent = 0, failed = 0;

  for (const row of overdue) {
    const message = templates.whatsapp.overdueAlert(row);
    const html    = templates.email.overdueAlert(row);
    const subject = `Overdue Payment Alert — ${row.milestone} | ${row.project_name}`;

    const results = await dispatch({
      channel, type: 'overdue_alert',
      booking_id:  row.booking_id,
      customer_id: row.customer_id,
      schedule_id: row.schedule_id,
      recipient_name:  row.customer_name,
      recipient_phone: row.customer_phone,
      recipient_email: row.customer_email,
      message, html, subject, sent_by,
    });

    results.forEach((r) => {
      if (r.status === 'sent') sent++;
      else failed++;
    });
  }

  return { total: overdue.length, sent, failed };
};

// ══════════════════════════════════════════════════════════════
// CUSTOM MESSAGE
// ══════════════════════════════════════════════════════════════

const sendCustom = async ({ booking_id, customer_id, channel, message, subject }, sent_by) => {
  let recipient_name, recipient_phone, recipient_email, resolved_customer_id;

  if (booking_id) {
    const ctx = await getBookingContext(booking_id);
    recipient_name  = ctx.customer_name;
    recipient_phone = ctx.customer_phone;
    recipient_email = ctx.customer_email;
    resolved_customer_id = ctx.customer_id;
  } else if (customer_id) {
    const { rows } = await db.query(`SELECT * FROM customers WHERE id = $1`, [customer_id]);
    if (!rows[0]) throw Object.assign(new Error('Customer not found'), { status: 404 });
    recipient_name  = rows[0].name;
    recipient_phone = rows[0].phone;
    recipient_email = rows[0].email;
    resolved_customer_id = customer_id;
  } else {
    throw Object.assign(new Error('Either booking_id or customer_id is required'), { status: 400 });
  }

  return dispatch({
    channel, type: 'custom',
    booking_id: booking_id || null,
    customer_id: resolved_customer_id,
    recipient_name, recipient_phone, recipient_email,
    message,
    html: `<p>${message}</p>`,
    subject: subject || 'Message from Nivara Ventures',
    sent_by,
  });
};

// ══════════════════════════════════════════════════════════════
// NOTIFICATION LOG QUERIES
// ══════════════════════════════════════════════════════════════

const getLog = async ({ channel, type, status, from_date, to_date } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (channel)   { conditions.push(`nl.channel = $${i++}`);           params.push(channel); }
  if (type)      { conditions.push(`nl.type    = $${i++}`);           params.push(type); }
  if (status)    { conditions.push(`nl.status  = $${i++}`);           params.push(status); }
  if (from_date) { conditions.push(`nl.sent_at >= $${i++}`);          params.push(from_date); }
  if (to_date)   { conditions.push(`nl.sent_at <= $${i++}`);          params.push(to_date); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
       nl.*,
       u.name AS sent_by_name
     FROM notification_log nl
     LEFT JOIN users u ON u.id = nl.sent_by
     ${where}
     ORDER BY nl.sent_at DESC
     LIMIT 200`,
    params
  );
  return rows;
};

const getLogByEntity = async (column, entityId) => {
  const { rows } = await db.query(
    `SELECT nl.*, u.name AS sent_by_name
     FROM notification_log nl
     LEFT JOIN users u ON u.id = nl.sent_by
     WHERE nl.${column} = $1
     ORDER BY nl.sent_at DESC`,
    [entityId]
  );
  return rows;
};

module.exports = {
  sendPaymentReceipt, sendPaymentReminder,
  sendBookingConfirmation, sendOverdueAlerts, sendCustom,
  getLog, getLogByEntity,
};