const db = require('../../config/db');

// ══════════════════════════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════════════════════════

const getAllCustomers = async ({ search } = {}) => {
  const params = [];
  const where  = search
    ? (params.push(`%${search}%`), `WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1`)
    : '';

  const { rows } = await db.query(
    `SELECT c.*,
       COUNT(b.id) AS total_bookings
     FROM customers c
     LEFT JOIN bookings b ON b.customer_id = c.id AND b.status != 'cancelled'
     ${where}
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    params
  );
  return rows;
};

const getCustomerById = async (id) => {
  const { rows } = await db.query(
    `SELECT c.*,
       json_agg(
         jsonb_build_object(
           'booking_id',    b.id,
           'project_name',  p.name,
           'flat_number',   f.flat_number,
           'final_value',   b.final_value,
           'status',        b.status,
           'booking_date',  b.booking_date
         )
       ) FILTER (WHERE b.id IS NOT NULL) AS bookings
     FROM customers c
     LEFT JOIN bookings b ON b.customer_id = c.id
     LEFT JOIN projects p ON p.id = b.project_id
     LEFT JOIN flats    f ON f.id = b.flat_id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Customer not found'), { status: 404 });
  return rows[0];
};

const createCustomer = async (data) => {
  const { name, phone, email, pan_number, aadhaar_number, address } = data;
  const { rows } = await db.query(
    `INSERT INTO customers (name, phone, email, pan_number, aadhaar_number, address)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [name, phone || null, email || null, pan_number || null, aadhaar_number || null, address || null]
  );
  return rows[0];
};

const updateCustomer = async (id, data) => {
  const allowed = ['name', 'phone', 'email', 'pan_number', 'aadhaar_number', 'address'];
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
    `UPDATE customers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw Object.assign(new Error('Customer not found'), { status: 404 });
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// BOOKINGS
// ══════════════════════════════════════════════════════════════

const getAll = async ({ project_id, status, broker_id, customer_id } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (project_id)  { conditions.push(`b.project_id  = $${i++}`); params.push(project_id); }
  if (status)      { conditions.push(`b.status       = $${i++}`); params.push(status); }
  if (broker_id)   { conditions.push(`b.broker_id    = $${i++}`); params.push(broker_id); }
  if (customer_id) { conditions.push(`b.customer_id  = $${i++}`); params.push(customer_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // First get all bookings with basic info
  const { rows: bookings } = await db.query(
    `SELECT
       b.*,
       p.name          AS project_name,
       f.flat_number,
       f.floor,
       f.configuration,
       c.name          AS customer_name,
       c.phone         AS customer_phone,
       c.email         AS customer_email,
       br.name         AS broker_name
     FROM bookings  b
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     JOIN customers c  ON c.id  = b.customer_id
     LEFT JOIN brokers br ON br.id = b.broker_id
     ${where}
     ORDER BY b.booking_date DESC`,
    params
  );

  // Get payment totals separately
  const { rows: paymentTotals } = await db.query(
    `SELECT booking_id, COALESCE(SUM(amount), 0) as total_paid
     FROM payments
     GROUP BY booking_id`
  );

  const paymentMap = Object.fromEntries(
    paymentTotals.map(pt => [pt.booking_id, pt.total_paid])
  );

  return bookings.map(b => ({
    ...b,
    total_paid: paymentMap[b.id] || 0,
    balance_due: (b.final_value || 0) - (paymentMap[b.id] || 0)
  }));
};

const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT
       b.*,
       p.name          AS project_name,
       p.sector_location,
       f.flat_number,
       f.floor,
       f.configuration,
       f.carpet_area,
       f.saleable_area,
       c.name          AS customer_name,
       c.phone         AS customer_phone,
       c.email         AS customer_email,
       c.pan_number,
       c.aadhaar_number,
       c.address       AS customer_address,
       br.name         AS broker_name,
       br.phone        AS broker_phone,
       u.name          AS created_by_name
     FROM bookings  b
     JOIN projects  p  ON p.id  = b.project_id
     JOIN flats     f  ON f.id  = b.flat_id
     JOIN customers c  ON c.id  = b.customer_id
     LEFT JOIN brokers br ON br.id = b.broker_id
     LEFT JOIN users   u  ON u.id  = b.created_by
     WHERE b.id = $1`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Booking not found'), { status: 404 });

  const booking = rows[0];
  
  // Get payment totals
  const { rows: paymentRows } = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE booking_id = $1`,
    [id]
  );
  
  booking.total_paid = paymentRows[0]?.total_paid || 0;
  booking.balance_due = (booking.final_value || 0) - booking.total_paid;

  // Attach payment schedule
  const { rows: schedule } = await db.query(
    `SELECT ps.*,
       COALESCE(
         json_agg(py ORDER BY py.payment_date) FILTER (WHERE py.id IS NOT NULL), '[]'
       ) AS payments_received
     FROM payment_schedules ps
     LEFT JOIN payments py ON py.schedule_id = ps.id
     WHERE ps.booking_id = $1
     GROUP BY ps.id
     ORDER BY ps.due_date ASC NULLS LAST`,
    [id]
  );
  return { ...rows[0], payment_schedule: schedule };
};

const create = async (data) => {
  const {
    project_id, flat_id, customer_id, broker_id,
    booking_date, booking_amount,
    agreement_value, discount, remarks,
    created_by, payment_schedules: schedules,
  } = data;

  // Compute final value
  const final_value = agreement_value
    ? parseFloat(agreement_value) - parseFloat(discount || 0)
    : null;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Guard: flat must be available
    const { rows: flatRows } = await client.query(
      `SELECT status FROM flats WHERE id = $1 FOR UPDATE`,
      [flat_id]
    );
    if (!flatRows[0]) throw Object.assign(new Error('Flat not found'), { status: 404 });
    if (flatRows[0].status !== 'available')
      throw Object.assign(
        new Error(`Flat is already ${flatRows[0].status} and cannot be booked`),
        { status: 400 }
      );

    // 2. Create booking
    const { rows: bookingRows } = await client.query(
      `INSERT INTO bookings
         (project_id, flat_id, customer_id, broker_id,
          booking_date, booking_amount,
          agreement_value, discount, final_value,
          remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        project_id, flat_id, customer_id, broker_id || null,
        booking_date || new Date(), booking_amount,
        agreement_value || null, discount || 0, final_value,
        remarks || null, created_by,
      ]
    );
    const booking = bookingRows[0];

    // 3. Block the flat
    await client.query(
      `UPDATE flats SET status = 'blocked', updated_at = NOW() WHERE id = $1`,
      [flat_id]
    );

    // 4. Insert payment schedules if provided
    if (schedules && schedules.length) {
      for (const s of schedules) {
        await client.query(
          `INSERT INTO payment_schedules (booking_id, milestone, due_date, amount_due)
           VALUES ($1,$2,$3,$4)`,
          [booking.id, s.milestone, s.due_date || null, s.amount_due]
        );
      }
    }

    await client.query('COMMIT');
    return getById(booking.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const update = async (id, data) => {
  const allowed = [
    'booking_date', 'booking_amount',
    'agreement_value', 'discount', 'final_value',
    'broker_id', 'remarks',
  ];
  const fields = [];
  const values = [];
  let   i = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) { fields.push(`${key} = $${i++}`); values.push(data[key]); }
  }
  if (!fields.length) throw new Error('No valid fields provided');

  // Auto-recalculate final_value if agreement_value or discount changed
  if ((data.agreement_value || data.discount) && !data.final_value) {
    fields.push(
      `final_value = COALESCE($${i++}, agreement_value) - COALESCE($${i++}, discount)`
    );
    values.push(data.agreement_value || null, data.discount || null);
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await db.query(
    `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw Object.assign(new Error('Booking not found'), { status: 404 });
  return getById(rows[0].id);
};

const cancel = async (id, { cancellation_reason } = {}) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [id]
    );
    if (!rows[0]) throw Object.assign(new Error('Booking not found'), { status: 404 });
    if (rows[0].status === 'cancelled')
      throw Object.assign(new Error('Booking is already cancelled'), { status: 400 });

    // 1. Cancel booking
    await client.query(
      `UPDATE bookings
       SET status = 'cancelled',
           cancellation_date = CURRENT_DATE,
           cancellation_reason = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [cancellation_reason || null, id]
    );

    // 2. Reset flat to available
    await client.query(
      `UPDATE flats SET status = 'available', updated_at = NOW() WHERE id = $1`,
      [rows[0].flat_id]
    );

    await client.query('COMMIT');
    return getById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateStatus = async (id, status) => {
  const valid = ['booked', 'agreement_signed', 'registered', 'cancelled'];
  if (!valid.includes(status))
    throw Object.assign(new Error(`Status must be one of: ${valid.join(', ')}`), { status: 422 });

  // If marking registered, auto-mark flat as sold
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!rows[0]) throw Object.assign(new Error('Booking not found'), { status: 404 });

    if (status === 'registered') {
      await client.query(
        `UPDATE flats SET status = 'sold', updated_at = NOW() WHERE id = $1`,
        [rows[0].flat_id]
      );
    }

    await client.query('COMMIT');
    return getById(rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ══════════════════════════════════════════════════════════════
// PAYMENT SCHEDULE
// ══════════════════════════════════════════════════════════════

const getSchedule = async (bookingId) => {
  const { rows } = await db.query(
    `SELECT ps.*,
       COALESCE(SUM(py.amount), 0)                 AS amount_paid,
       ps.amount_due - COALESCE(SUM(py.amount), 0) AS amount_pending
     FROM payment_schedules ps
     LEFT JOIN payments py ON py.schedule_id = ps.id
     WHERE ps.booking_id = $1
     GROUP BY ps.id
     ORDER BY ps.due_date ASC NULLS LAST`,
    [bookingId]
  );
  return rows;
};

const addSchedule = async (bookingId, { milestone, due_date, amount_due }) => {
  const { rows: b } = await db.query(
    `SELECT id FROM bookings WHERE id = $1 AND status != 'cancelled'`, [bookingId]
  );
  if (!b[0]) throw Object.assign(new Error('Active booking not found'), { status: 404 });

  const { rows } = await db.query(
    `INSERT INTO payment_schedules (booking_id, milestone, due_date, amount_due)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [bookingId, milestone, due_date || null, amount_due]
  );
  return rows[0];
};

const removeSchedule = async (bookingId, scheduleId) => {
  // Prevent delete if already paid
  const { rows } = await db.query(
    `SELECT is_paid FROM payment_schedules WHERE id = $1 AND booking_id = $2`,
    [scheduleId, bookingId]
  );
  if (!rows[0]) throw Object.assign(new Error('Schedule milestone not found'), { status: 404 });
  if (rows[0].is_paid)
    throw Object.assign(new Error('Cannot delete a milestone that is already paid'), { status: 400 });

  await db.query('DELETE FROM payment_schedules WHERE id = $1', [scheduleId]);
};

module.exports = {
  getAllCustomers, getCustomerById, createCustomer, updateCustomer,
  getAll, getById, create, update, cancel, updateStatus,
  getSchedule, addSchedule, removeSchedule,
};