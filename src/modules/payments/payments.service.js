const db = require('../../config/db');

// ══════════════════════════════════════════════════════════════
// RECORD PAYMENT
// ══════════════════════════════════════════════════════════════

const record = async (data) => {
  const {
    booking_id, schedule_id,
    payment_date, amount,
    payment_type, payment_mode,
    reference_no, bank_name,
    remarks, received_by,
  } = data;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Validate booking exists and is not cancelled
    const { rows: bookingRows } = await client.query(
      `SELECT b.id, b.final_value, b.flat_id, b.status,
              COALESCE(SUM(p.amount), 0) AS already_paid
       FROM bookings b
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.id = $1
       GROUP BY b.id`,
      [booking_id]
    );
    if (!bookingRows[0])
      throw Object.assign(new Error('Booking not found'), { status: 404 });
    if (bookingRows[0].status === 'cancelled')
      throw Object.assign(new Error('Cannot record payment for a cancelled booking'), { status: 400 });

    const { final_value, already_paid } = bookingRows[0];
    const newTotal = parseFloat(already_paid) + parseFloat(amount);

    if (final_value && newTotal > parseFloat(final_value))
      throw Object.assign(
        new Error(`Payment of ₹${amount} exceeds outstanding balance of ₹${(final_value - already_paid).toFixed(2)}`),
        { status: 400 }
      );

    // 2. Insert payment
    const { rows: payRows } = await client.query(
      `INSERT INTO payments
         (booking_id, schedule_id, payment_date, amount,
          payment_type, payment_mode, reference_no,
          bank_name, remarks, received_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        booking_id, schedule_id || null,
        payment_date || new Date(), amount,
        payment_type, payment_mode,
        reference_no || null, bank_name || null,
        remarks || null, received_by,
      ]
    );
    const payment = payRows[0];

    // 3. If linked to a schedule milestone, mark it paid
    if (schedule_id) {
      const { rows: schedRows } = await client.query(
        `SELECT ps.amount_due,
                COALESCE(SUM(p.amount), 0) AS paid_so_far
         FROM payment_schedules ps
         LEFT JOIN payments p ON p.schedule_id = ps.id AND p.id != $1
         WHERE ps.id = $2
         GROUP BY ps.id`,
        [payment.id, schedule_id]
      );
      if (schedRows[0]) {
        const totalForMilestone =
          parseFloat(schedRows[0].paid_so_far) + parseFloat(amount);
        if (totalForMilestone >= parseFloat(schedRows[0].amount_due)) {
          await client.query(
            `UPDATE payment_schedules SET is_paid = TRUE WHERE id = $1`,
            [schedule_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    return getById(payment.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ══════════════════════════════════════════════════════════════
// GET ALL PAYMENTS (filtered)
// ══════════════════════════════════════════════════════════════

const getAll = async ({ project_id, booking_id, payment_type, payment_mode, from_date, to_date } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (project_id)    { conditions.push(`b.project_id    = $${i++}`); params.push(project_id); }
  if (booking_id)    { conditions.push(`py.booking_id   = $${i++}`); params.push(booking_id); }
  if (payment_type)  { conditions.push(`py.payment_type = $${i++}`); params.push(payment_type); }
  if (payment_mode)  { conditions.push(`py.payment_mode = $${i++}`); params.push(payment_mode); }
  if (from_date)     { conditions.push(`py.payment_date >= $${i++}`); params.push(from_date); }
  if (to_date)       { conditions.push(`py.payment_date <= $${i++}`); params.push(to_date); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
       py.*,
       b.final_value,
       p.name          AS project_name,
       f.flat_number,
       f.configuration,
       c.name          AS customer_name,
       c.phone         AS customer_phone,
       ps.milestone,
       u.name          AS received_by_name
     FROM payments py
     JOIN bookings  b  ON b.id  = py.booking_id
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     JOIN customers c  ON c.id  = b.customer_id
     LEFT JOIN payment_schedules ps ON ps.id = py.schedule_id
     LEFT JOIN users             u  ON u.id  = py.received_by
     ${where}
     ORDER BY py.payment_date DESC, py.created_at DESC`,
    params
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// GET SINGLE PAYMENT
// ══════════════════════════════════════════════════════════════

const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT
       py.*,
       b.final_value,
       b.agreement_value,
       p.name          AS project_name,
       f.flat_number,
       f.floor,
       f.configuration,
       c.name          AS customer_name,
       c.phone         AS customer_phone,
       ps.milestone,
       u.name          AS received_by_name
     FROM payments py
     JOIN bookings  b  ON b.id  = py.booking_id
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     JOIN customers c  ON c.id  = b.customer_id
     LEFT JOIN payment_schedules ps ON ps.id = py.schedule_id
     LEFT JOIN users             u  ON u.id  = py.received_by
     WHERE py.id = $1`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Payment not found'), { status: 404 });
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// GET ALL PAYMENTS FOR A BOOKING
// ══════════════════════════════════════════════════════════════

const getByBooking = async (bookingId) => {
  const { rows } = await db.query(
    `SELECT
       py.*,
       ps.milestone,
       u.name AS received_by_name
     FROM payments py
     LEFT JOIN payment_schedules ps ON ps.id = py.schedule_id
     LEFT JOIN users             u  ON u.id  = py.received_by
     WHERE py.booking_id = $1
     ORDER BY py.payment_date ASC`,
    [bookingId]
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// FULL CUSTOMER LEDGER FOR A BOOKING
// ══════════════════════════════════════════════════════════════

const getLedger = async (bookingId) => {
  // Booking header
  const { rows: bookingRows } = await db.query(
    `SELECT
       b.*,
       p.name       AS project_name,
       f.flat_number, f.floor, f.configuration,
       c.name       AS customer_name,
       c.phone      AS customer_phone,
       c.email      AS customer_email,
       c.pan_number,
       br.name      AS broker_name
     FROM bookings  b
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     JOIN customers c  ON c.id  = b.customer_id
     LEFT JOIN brokers br ON br.id = b.broker_id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (!bookingRows[0])
    throw Object.assign(new Error('Booking not found'), { status: 404 });

  // All payments made
  const { rows: payments } = await db.query(
    `SELECT
       py.*,
       ps.milestone,
       u.name AS received_by_name
     FROM payments py
     LEFT JOIN payment_schedules ps ON ps.id = py.schedule_id
     LEFT JOIN users             u  ON u.id  = py.received_by
     WHERE py.booking_id = $1
     ORDER BY py.payment_date ASC`,
    [bookingId]
  );

  // Payment schedule with paid/pending split
  const { rows: schedule } = await db.query(
    `SELECT
       ps.*,
       COALESCE(SUM(py.amount), 0)                 AS amount_paid,
       ps.amount_due - COALESCE(SUM(py.amount), 0) AS amount_pending
     FROM payment_schedules ps
     LEFT JOIN payments py ON py.schedule_id = ps.id
     WHERE ps.booking_id = $1
     GROUP BY ps.id
     ORDER BY ps.due_date ASC NULLS LAST`,
    [bookingId]
  );

  // Computed totals
  const total_paid    = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const final_value   = parseFloat(bookingRows[0].final_value || 0);
  const balance_due   = final_value - total_paid;

  // Running balance per payment row
  let running = 0;
  const ledger_rows = payments.map((p) => {
    running += parseFloat(p.amount);
    return {
      ...p,
      running_total: running.toFixed(2),
      balance_after: (final_value - running).toFixed(2),
    };
  });

  return {
    booking:          bookingRows[0],
    summary: {
      agreement_value: bookingRows[0].agreement_value,
      discount:        bookingRows[0].discount,
      final_value:     final_value.toFixed(2),
      total_paid:      total_paid.toFixed(2),
      balance_due:     balance_due.toFixed(2),
      payment_count:   payments.length,
    },
    payment_schedule: schedule,
    ledger:           ledger_rows,
  };
};

// ══════════════════════════════════════════════════════════════
// OVERDUE SCHEDULES (past due_date and unpaid)
// ══════════════════════════════════════════════════════════════

const getOverdue = async ({ project_id } = {}) => {
  const conditions = [`ps.due_date < CURRENT_DATE`, `ps.is_paid = FALSE`];
  const params     = [];
  let   i = 1;

  if (project_id) {
    conditions.push(`b.project_id = $${i++}`);
    params.push(project_id);
  }

  const { rows } = await db.query(
    `SELECT
       ps.id           AS schedule_id,
       ps.milestone,
       ps.due_date,
       ps.amount_due,
       CURRENT_DATE - ps.due_date   AS days_overdue,
       b.id            AS booking_id,
       p.name          AS project_name,
       f.flat_number,
       f.configuration,
       c.name          AS customer_name,
       c.phone         AS customer_phone,
       c.email         AS customer_email
     FROM payment_schedules ps
     JOIN bookings  b ON b.id  = ps.booking_id AND b.status != 'cancelled'
     JOIN projects  p ON p.id  = b.project_id
     JOIN flats     f ON f.id  = b.flat_id
     JOIN customers c ON c.id  = b.customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ps.due_date ASC`,
    params
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// OUTSTANDING BALANCE PER BOOKING
// ══════════════════════════════════════════════════════════════

const getOutstanding = async ({ project_id } = {}) => {
  const conditions = [`b.status != 'cancelled'`, `b.final_value IS NOT NULL`];
  const params     = [];
  let   i = 1;

  if (project_id) {
    conditions.push(`b.project_id = $${i++}`);
    params.push(project_id);
  }

  const { rows } = await db.query(
    `SELECT
       b.id              AS booking_id,
       p.name            AS project_name,
       f.flat_number,
       f.configuration,
       c.name            AS customer_name,
       c.phone           AS customer_phone,
       b.booking_date,
       b.final_value,
       COALESCE(SUM(py.amount), 0)                   AS total_paid,
       b.final_value - COALESCE(SUM(py.amount), 0)   AS balance_due,
       ROUND(
         COALESCE(SUM(py.amount), 0) / NULLIF(b.final_value, 0) * 100, 2
       )                                              AS percent_paid
     FROM bookings  b
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     JOIN customers c  ON c.id  = b.customer_id
     LEFT JOIN payments py ON py.booking_id = b.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY b.id, p.name, f.flat_number, f.configuration,
              c.name, c.phone
     HAVING b.final_value - COALESCE(SUM(py.amount), 0) > 0
     ORDER BY balance_due DESC`,
    params
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// MONTHLY COLLECTION SUMMARY
// ══════════════════════════════════════════════════════════════

const getMonthlySummary = async (month, year) => {
  // Total collected this month
  const { rows: totals } = await db.query(
    `SELECT
       COUNT(*)                                          AS payment_count,
       COALESCE(SUM(amount), 0)                         AS total_collected,
       COALESCE(SUM(amount) FILTER (WHERE payment_type = 'booking'),      0) AS booking_amount,
       COALESCE(SUM(amount) FILTER (WHERE payment_type = 'agreement'),    0) AS agreement_amount,
       COALESCE(SUM(amount) FILTER (WHERE payment_type = 'instalment'),   0) AS instalment_amount,
       COALESCE(SUM(amount) FILTER (WHERE payment_type = 'registration'), 0) AS registration_amount,
       COALESCE(SUM(amount) FILTER (WHERE payment_type = 'other'),        0) AS other_amount
     FROM payments
     WHERE EXTRACT(MONTH FROM payment_date) = $1
       AND EXTRACT(YEAR  FROM payment_date) = $2`,
    [month, year]
  );

  // Breakdown by payment mode
  const { rows: byMode } = await db.query(
    `SELECT
       payment_mode,
       COUNT(*)         AS count,
       SUM(amount)      AS total
     FROM payments
     WHERE EXTRACT(MONTH FROM payment_date) = $1
       AND EXTRACT(YEAR  FROM payment_date) = $2
     GROUP BY payment_mode
     ORDER BY total DESC`,
    [month, year]
  );

  // Breakdown by project
  const { rows: byProject } = await db.query(
    `SELECT
       p.name           AS project_name,
       COUNT(py.id)     AS payment_count,
       SUM(py.amount)   AS total_collected
     FROM payments py
     JOIN bookings b ON b.id = py.booking_id
     JOIN projects p ON p.id = b.project_id
     WHERE EXTRACT(MONTH FROM py.payment_date) = $1
       AND EXTRACT(YEAR  FROM py.payment_date) = $2
     GROUP BY p.id, p.name
     ORDER BY total_collected DESC`,
    [month, year]
  );

  return {
    month, year,
    summary:    totals[0],
    by_mode:    byMode,
    by_project: byProject,
  };
};

// ══════════════════════════════════════════════════════════════
// UPDATE PAYMENT
// ══════════════════════════════════════════════════════════════

const update = async (id, data) => {
  const allowed = ['payment_date','payment_type','payment_mode','reference_no','bank_name','remarks'];
  const fields  = [];
  const values  = [];
  let   i = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) { fields.push(`${key} = $${i++}`); values.push(data[key]); }
  }
  if (!fields.length) throw new Error('No valid fields provided');

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await db.query(
    `UPDATE payments SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw Object.assign(new Error('Payment not found'), { status: 404 });
  return getById(rows[0].id);
};

// ══════════════════════════════════════════════════════════════
// DELETE PAYMENT
// ══════════════════════════════════════════════════════════════

const remove = async (id) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM payments WHERE id = $1`, [id]
    );
    if (!rows[0]) throw Object.assign(new Error('Payment not found'), { status: 404 });

    // If linked to a schedule, un-mark it as paid
    if (rows[0].schedule_id) {
      await client.query(
        `UPDATE payment_schedules SET is_paid = FALSE WHERE id = $1`,
        [rows[0].schedule_id]
      );
    }

    await client.query('DELETE FROM payments WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  record, getAll, getById,
  getByBooking, getLedger,
  getOverdue, getOutstanding,
  getMonthlySummary,
  update, remove,
};