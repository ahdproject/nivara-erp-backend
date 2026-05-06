const db = require('../../config/db');

// ══════════════════════════════════════════════════════════════
// ALL CUSTOMERS — Summary cards for ledger list page
// ══════════════════════════════════════════════════════════════

const getAllCustomerSummaries = async ({ project_id, search } = {}) => {
  const conditions = [`b.status != 'cancelled'`];
  const params     = [];
  let   i = 1;

  if (project_id) {
    conditions.push(`b.project_id = $${i++}`);
    params.push(project_id);
  }
  if (search) {
    conditions.push(`(c.name ILIKE $${i} OR c.phone ILIKE $${i} OR c.email ILIKE $${i})`);
    params.push(`%${search}%`);
    i++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows } = await db.query(
    `SELECT
       c.id                                              AS customer_id,
       c.name                                            AS customer_name,
       c.phone,
       c.email,
       c.pan_number,
       COUNT(DISTINCT b.id)                              AS total_bookings,
       COALESCE(SUM(b.final_value), 0)                  AS total_agreement_value,
       COALESCE(SUM(py.amount), 0)                       AS total_paid,
       COALESCE(SUM(b.final_value), 0)
         - COALESCE(SUM(py.amount), 0)                  AS total_balance_due,
       ROUND(
         COALESCE(SUM(py.amount), 0)
           / NULLIF(SUM(b.final_value), 0) * 100, 2
       )                                                 AS overall_percent_paid,
       MAX(py.payment_date)                              AS last_payment_date,
       -- Overdue flag: any unpaid schedule past due date
       BOOL_OR(
         ps.due_date < CURRENT_DATE AND ps.is_paid = FALSE
       )                                                 AS has_overdue
     FROM customers c
     JOIN bookings          b  ON b.customer_id = c.id
     LEFT JOIN payments     py ON py.booking_id  = b.id
     LEFT JOIN payment_schedules ps ON ps.booking_id = b.id
     ${where}
     GROUP BY c.id, c.name, c.phone, c.email, c.pan_number
     ORDER BY total_balance_due DESC`,
    params
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// SINGLE CUSTOMER — Full ledger across all their bookings
// ══════════════════════════════════════════════════════════════

const getCustomerLedger = async (customerId) => {

  // 1. Customer profile
  const { rows: customerRows } = await db.query(
    `SELECT * FROM customers WHERE id = $1`, [customerId]
  );
  if (!customerRows[0])
    throw Object.assign(new Error('Customer not found'), { status: 404 });
  const customer = customerRows[0];

  // 2. All active bookings for this customer
  const { rows: bookings } = await db.query(
    `SELECT
       b.id              AS booking_id,
       b.booking_date,
       b.status          AS booking_status,
       b.booking_amount,
       b.agreement_value,
       b.discount,
       b.final_value,
       p.id              AS project_id,
       p.name            AS project_name,
       f.flat_number,
       f.floor,
       f.configuration,
       f.carpet_area,
       f.saleable_area,
       br.name           AS broker_name
     FROM bookings  b
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     LEFT JOIN brokers br ON br.id = b.broker_id
     WHERE b.customer_id = $1
     ORDER BY b.booking_date DESC`,
    [customerId]
  );

  // 3. For each booking — attach payments + schedule + running balance
  const bookingsWithLedger = await Promise.all(
    bookings.map(async (booking) => {

      // All payments for this booking
      const { rows: payments } = await db.query(
        `SELECT
           py.id,
           py.payment_date,
           py.amount,
           py.payment_type,
           py.payment_mode,
           py.reference_no,
           py.bank_name,
           py.remarks,
           ps.milestone,
           u.name AS received_by_name
         FROM payments py
         LEFT JOIN payment_schedules ps ON ps.id = py.schedule_id
         LEFT JOIN users             u  ON u.id  = py.received_by
         WHERE py.booking_id = $1
         ORDER BY py.payment_date ASC, py.created_at ASC`,
        [booking.booking_id]
      );

      // Payment schedule for this booking
      const { rows: schedule } = await db.query(
        `SELECT
           ps.id,
           ps.milestone,
           ps.due_date,
           ps.amount_due,
           ps.is_paid,
           COALESCE(SUM(py.amount), 0)                 AS amount_paid,
           ps.amount_due - COALESCE(SUM(py.amount), 0) AS amount_pending,
           CASE
             WHEN ps.is_paid = TRUE              THEN 'paid'
             WHEN ps.due_date < CURRENT_DATE     THEN 'overdue'
             WHEN ps.due_date >= CURRENT_DATE    THEN 'upcoming'
             ELSE 'no_due_date'
           END AS milestone_status
         FROM payment_schedules ps
         LEFT JOIN payments py ON py.schedule_id = ps.id
         WHERE ps.booking_id = $1
         GROUP BY ps.id
         ORDER BY ps.due_date ASC NULLS LAST`,
        [booking.booking_id]
      );

      // Build running balance ledger rows
      const final_value  = parseFloat(booking.final_value || 0);
      let   running      = 0;
      const ledger_rows  = payments.map((p) => {
        running += parseFloat(p.amount);
        return {
          ...p,
          running_total: parseFloat(running.toFixed(2)),
          balance_after: parseFloat((final_value - running).toFixed(2)),
        };
      });

      // Booking-level totals
      const total_paid  = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
      const balance_due = final_value - total_paid;

      return {
        ...booking,
        totals: {
          final_value:   parseFloat(final_value.toFixed(2)),
          total_paid:    parseFloat(total_paid.toFixed(2)),
          balance_due:   parseFloat(balance_due.toFixed(2)),
          percent_paid:  final_value
            ? parseFloat(((total_paid / final_value) * 100).toFixed(2))
            : 0,
        },
        payment_schedule: schedule,
        ledger:           ledger_rows,
      };
    })
  );

  // 4. Customer-level aggregated totals across all bookings
  const totals = bookingsWithLedger.reduce(
    (acc, b) => {
      acc.total_agreement_value += parseFloat(b.final_value   || 0);
      acc.total_paid            += parseFloat(b.totals.total_paid);
      acc.total_balance_due     += parseFloat(b.totals.balance_due);
      return acc;
    },
    { total_agreement_value: 0, total_paid: 0, total_balance_due: 0 }
  );

  const overall_percent_paid = totals.total_agreement_value
    ? parseFloat(((totals.total_paid / totals.total_agreement_value) * 100).toFixed(2))
    : 0;

  return {
    customer,
    summary: {
      ...totals,
      total_agreement_value: parseFloat(totals.total_agreement_value.toFixed(2)),
      total_paid:            parseFloat(totals.total_paid.toFixed(2)),
      total_balance_due:     parseFloat(totals.total_balance_due.toFixed(2)),
      overall_percent_paid,
      total_bookings: bookingsWithLedger.length,
    },
    bookings: bookingsWithLedger,
  };
};

// ══════════════════════════════════════════════════════════════
// ACCOUNT STATEMENT — Flat chronological view for printing
// ══════════════════════════════════════════════════════════════

const getStatement = async (customerId, { from_date, to_date } = {}) => {

  const { rows: customerRows } = await db.query(
    `SELECT * FROM customers WHERE id = $1`, [customerId]
  );
  if (!customerRows[0])
    throw Object.assign(new Error('Customer not found'), { status: 404 });

  const conditions = [`b.customer_id = $1`, `b.status != 'cancelled'`];
  const params     = [customerId];
  let   i = 2;

  if (from_date) { conditions.push(`py.payment_date >= $${i++}`); params.push(from_date); }
  if (to_date)   { conditions.push(`py.payment_date <= $${i++}`); params.push(to_date); }

  // All payments chronologically across all bookings
  const { rows: allPayments } = await db.query(
    `SELECT
       py.id             AS payment_id,
       py.payment_date,
       py.amount,
       py.payment_type,
       py.payment_mode,
       py.reference_no,
       py.bank_name,
       py.remarks,
       ps.milestone,
       b.id              AS booking_id,
       p.name            AS project_name,
       f.flat_number,
       f.configuration
     FROM payments py
     JOIN bookings  b  ON b.id  = py.booking_id
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     LEFT JOIN payment_schedules ps ON ps.id = py.schedule_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY py.payment_date ASC, py.created_at ASC`,
    params
  );

  // Build running balance across all payments
  const { rows: totalRows } = await db.query(
    `SELECT COALESCE(SUM(b.final_value), 0) AS total_agreement
     FROM bookings b
     WHERE b.customer_id = $1 AND b.status != 'cancelled'`,
    [customerId]
  );
  const total_agreement = parseFloat(totalRows[0].total_agreement);

  let running = 0;
  const statement_rows = allPayments.map((p) => {
    running += parseFloat(p.amount);
    return {
      ...p,
      running_total: parseFloat(running.toFixed(2)),
      balance_after: parseFloat((total_agreement - running).toFixed(2)),
    };
  });

  return {
    customer:        customerRows[0],
    period: {
      from_date: from_date || null,
      to_date:   to_date   || null,
    },
    summary: {
      total_agreement_value: parseFloat(total_agreement.toFixed(2)),
      total_paid:            parseFloat(running.toFixed(2)),
      balance_due:           parseFloat((total_agreement - running).toFixed(2)),
      total_transactions:    allPayments.length,
    },
    statement: statement_rows,
    generated_at: new Date().toISOString(),
  };
};

// ══════════════════════════════════════════════════════════════
// SINGLE BOOKING LEDGER (used from ledger module directly)
// ══════════════════════════════════════════════════════════════

const getBookingLedger = async (bookingId) => {

  const { rows: bookingRows } = await db.query(
    `SELECT
       b.*,
       p.name        AS project_name,
       p.sector_location,
       f.flat_number, f.floor, f.configuration,
       f.carpet_area, f.saleable_area,
       c.id          AS customer_id,
       c.name        AS customer_name,
       c.phone       AS customer_phone,
       c.email       AS customer_email,
       c.pan_number,
       c.address     AS customer_address,
       br.name       AS broker_name
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
  const booking = bookingRows[0];

  // All payments
  const { rows: payments } = await db.query(
    `SELECT
       py.id,
       py.payment_date,
       py.amount,
       py.payment_type,
       py.payment_mode,
       py.reference_no,
       py.bank_name,
       py.remarks,
       ps.milestone,
       u.name AS received_by_name
     FROM payments py
     LEFT JOIN payment_schedules ps ON ps.id = py.schedule_id
     LEFT JOIN users             u  ON u.id  = py.received_by
     WHERE py.booking_id = $1
     ORDER BY py.payment_date ASC, py.created_at ASC`,
    [bookingId]
  );

  // Payment schedule with status labels
  const { rows: schedule } = await db.query(
    `SELECT
       ps.id,
       ps.milestone,
       ps.due_date,
       ps.amount_due,
       ps.is_paid,
       COALESCE(SUM(py.amount), 0)                 AS amount_paid,
       ps.amount_due - COALESCE(SUM(py.amount), 0) AS amount_pending,
       CASE
         WHEN ps.is_paid = TRUE           THEN 'paid'
         WHEN ps.due_date < CURRENT_DATE  THEN 'overdue'
         WHEN ps.due_date >= CURRENT_DATE THEN 'upcoming'
         ELSE 'no_due_date'
       END AS milestone_status
     FROM payment_schedules ps
     LEFT JOIN payments py ON py.schedule_id = ps.id
     WHERE ps.booking_id = $1
     GROUP BY ps.id
     ORDER BY ps.due_date ASC NULLS LAST`,
    [bookingId]
  );

  // Running balance rows
  const final_value = parseFloat(booking.final_value || 0);
  let   running     = 0;
  const ledger_rows = payments.map((p) => {
    running += parseFloat(p.amount);
    return {
      ...p,
      running_total: parseFloat(running.toFixed(2)),
      balance_after: parseFloat((final_value - running).toFixed(2)),
    };
  });

  const total_paid  = running;
  const balance_due = final_value - total_paid;

  return {
    booking,
    summary: {
      agreement_value: parseFloat((booking.agreement_value || 0).toString()),
      discount:        parseFloat((booking.discount || 0).toString()),
      final_value:     parseFloat(final_value.toFixed(2)),
      total_paid:      parseFloat(total_paid.toFixed(2)),
      balance_due:     parseFloat(balance_due.toFixed(2)),
      percent_paid:    final_value
        ? parseFloat(((total_paid / final_value) * 100).toFixed(2))
        : 0,
      payment_count:   payments.length,
    },
    payment_schedule: schedule,
    ledger:           ledger_rows,
    generated_at:     new Date().toISOString(),
  };
};

// ══════════════════════════════════════════════════════════════
// OVERDUE CUSTOMERS — Customers with at least 1 missed milestone
// ══════════════════════════════════════════════════════════════

const getOverdueCustomers = async ({ project_id } = {}) => {
  const conditions = [
    `ps.due_date < CURRENT_DATE`,
    `ps.is_paid = FALSE`,
    `b.status != 'cancelled'`,
  ];
  const params = [];
  let   i = 1;

  if (project_id) {
    conditions.push(`b.project_id = $${i++}`);
    params.push(project_id);
  }

  const { rows } = await db.query(
    `SELECT
       c.id                            AS customer_id,
       c.name                          AS customer_name,
       c.phone,
       c.email,
       COUNT(DISTINCT ps.id)           AS overdue_milestones,
       SUM(ps.amount_due
         - COALESCE(paid.paid_amount, 0)) AS total_overdue_amount,
       MIN(ps.due_date)                AS earliest_overdue_date,
       MAX(CURRENT_DATE - ps.due_date) AS max_days_overdue,
       p.name                          AS project_name,
       f.flat_number,
       f.configuration
     FROM payment_schedules ps
     JOIN bookings  b  ON b.id  = ps.booking_id
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     JOIN customers c  ON c.id  = b.customer_id
     LEFT JOIN (
       SELECT schedule_id, SUM(amount) AS paid_amount
       FROM payments
       GROUP BY schedule_id
     ) paid ON paid.schedule_id = ps.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY c.id, c.name, c.phone, c.email, p.name, f.flat_number, f.configuration
     ORDER BY max_days_overdue DESC, total_overdue_amount DESC`,
    params
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// FULLY PAID CUSTOMERS
// ══════════════════════════════════════════════════════════════

const getFullyPaidCustomers = async ({ project_id } = {}) => {
  const conditions = [`b.status != 'cancelled'`, `b.final_value IS NOT NULL`];
  const params     = [];
  let   i = 1;

  if (project_id) {
    conditions.push(`b.project_id = $${i++}`);
    params.push(project_id);
  }

  const { rows } = await db.query(
    `SELECT
       c.id                           AS customer_id,
       c.name                         AS customer_name,
       c.phone,
       c.email,
       p.name                         AS project_name,
       f.flat_number,
       f.configuration,
       b.id                           AS booking_id,
       b.final_value,
       COALESCE(SUM(py.amount), 0)    AS total_paid,
       MAX(py.payment_date)           AS last_payment_date
     FROM bookings  b
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     JOIN customers c  ON c.id  = b.customer_id
     LEFT JOIN payments py ON py.booking_id = b.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY c.id, c.name, c.phone, c.email,
              p.name, f.flat_number, f.configuration,
              b.id, b.final_value
     HAVING COALESCE(SUM(py.amount), 0) >= b.final_value
     ORDER BY MAX(py.payment_date) DESC`,
    params
  );
  return rows;
};

module.exports = {
  getAllCustomerSummaries,
  getCustomerLedger,
  getStatement,
  getBookingLedger,
  getOverdueCustomers,
  getFullyPaidCustomers,
};