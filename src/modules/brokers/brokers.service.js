const db = require('../../config/db');

// ══════════════════════════════════════════════════════════════
// BROKERS
// ══════════════════════════════════════════════════════════════

const getAll = async ({ is_active, search } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (is_active !== undefined) {
    conditions.push(`br.is_active = $${i++}`);
    params.push(is_active === 'true');
  }
  if (search) {
    conditions.push(
      `(br.name ILIKE $${i} OR br.phone ILIKE $${i} OR br.company ILIKE $${i})`
    );
    params.push(`%${search}%`);
    i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
       br.*,
       COUNT(DISTINCT bc.booking_id)                        AS total_deals,
       COALESCE(SUM(bc.commission_amount), 0)               AS total_commission_earned,
       COALESCE(SUM(bc.paid_amount), 0)                     AS total_commission_paid,
       COALESCE(SUM(bc.commission_amount), 0)
         - COALESCE(SUM(bc.paid_amount), 0)                 AS total_commission_pending
     FROM brokers br
     LEFT JOIN broker_commissions bc ON bc.broker_id = br.id
     ${where}
     GROUP BY br.id
     ORDER BY br.name ASC`,
    params
  );
  return rows;
};

// ─── Dashboard summary across all brokers ─────────────────────────────────────
const getSummary = async () => {
  const { rows } = await db.query(
    `SELECT
       COUNT(DISTINCT br.id)                             AS total_brokers,
       COUNT(DISTINCT br.id) FILTER (WHERE br.is_active) AS active_brokers,
       COUNT(DISTINCT bc.booking_id)                     AS total_deals_sourced,
       COALESCE(SUM(bc.commission_amount), 0)            AS total_commission_payable,
       COALESCE(SUM(bc.paid_amount), 0)                  AS total_commission_paid,
       COALESCE(SUM(bc.commission_amount), 0)
         - COALESCE(SUM(bc.paid_amount), 0)              AS total_commission_pending,
       COUNT(bc.id) FILTER (WHERE bc.status = 'pending') AS pending_commission_records,
       COUNT(bc.id) FILTER (WHERE bc.status = 'partial') AS partial_commission_records
     FROM brokers br
     LEFT JOIN broker_commissions bc ON bc.broker_id = br.id`
  );
  return rows[0];
};

// ─── Single broker with full deal history ─────────────────────────────────────
const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT
       br.*,
       COUNT(DISTINCT bc.booking_id)                        AS total_deals,
       COALESCE(SUM(bc.commission_amount), 0)               AS total_commission_earned,
       COALESCE(SUM(bc.paid_amount), 0)                     AS total_commission_paid,
       COALESCE(SUM(bc.commission_amount), 0)
         - COALESCE(SUM(bc.paid_amount), 0)                 AS total_commission_pending
     FROM brokers br
     LEFT JOIN broker_commissions bc ON bc.broker_id = br.id
     WHERE br.id = $1
     GROUP BY br.id`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Broker not found'), { status: 404 });
  return rows[0];
};

const create = async ({ name, phone, email, company, rera_number, commission_pct }) => {
  const { rows } = await db.query(
    `INSERT INTO brokers (name, phone, email, company, rera_number, commission_pct)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [name, phone || null, email || null, company || null, rera_number || null, commission_pct || 0]
  );
  return rows[0];
};

const update = async (id, data) => {
  const allowed = ['name', 'phone', 'email', 'company', 'rera_number', 'commission_pct'];
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
    `UPDATE brokers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw Object.assign(new Error('Broker not found'), { status: 404 });
  return rows[0];
};

const setActive = async (id, is_active) => {
  const { rows } = await db.query(
    `UPDATE brokers SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [is_active, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Broker not found'), { status: 404 });
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// COMMISSIONS
// ══════════════════════════════════════════════════════════════

const getAllCommissions = async ({ status, project_id } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (status)     { conditions.push(`bc.status       = $${i++}`); params.push(status); }
  if (project_id) { conditions.push(`b.project_id    = $${i++}`); params.push(project_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
       bc.*,
       br.name           AS broker_name,
       br.phone          AS broker_phone,
       p.name            AS project_name,
       f.flat_number,
       f.configuration,
       c.name            AS customer_name,
       b.booking_date,
       b.final_value     AS booking_value
     FROM broker_commissions bc
     JOIN brokers    br ON br.id = bc.broker_id
     JOIN bookings   b  ON b.id  = bc.booking_id
     JOIN projects   p  ON p.id  = b.project_id
     JOIN flats      f  ON f.id  = b.flat_id
     JOIN customers  c  ON c.id  = b.customer_id
     ${where}
     ORDER BY bc.created_at DESC`,
    params
  );
  return rows;
};

// ─── Pending + Partial commissions only ───────────────────────────────────────
const getPendingCommissions = async ({ project_id } = {}) => {
  const conditions = [`bc.status IN ('pending','partial')`];
  const params     = [];
  let   i = 1;

  if (project_id) { conditions.push(`b.project_id = $${i++}`); params.push(project_id); }

  const { rows } = await db.query(
    `SELECT
       bc.*,
       br.name           AS broker_name,
       br.phone          AS broker_phone,
       p.name            AS project_name,
       f.flat_number,
       f.configuration,
       c.name            AS customer_name,
       b.final_value     AS booking_value
     FROM broker_commissions bc
     JOIN brokers    br ON br.id = bc.broker_id
     JOIN bookings   b  ON b.id  = bc.booking_id
     JOIN projects   p  ON p.id  = b.project_id
     JOIN flats      f  ON f.id  = b.flat_id
     JOIN customers  c  ON c.id  = b.customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY bc.created_at ASC`,
    params
  );
  return rows;
};

// ─── All commissions for one broker ───────────────────────────────────────────
const getBrokerCommissions = async (brokerId, { status } = {}) => {
  const conditions = [`bc.broker_id = $1`];
  const params     = [brokerId];
  let   i = 2;

  if (status) { conditions.push(`bc.status = $${i++}`); params.push(status); }

  const { rows } = await db.query(
    `SELECT
       bc.*,
       p.name            AS project_name,
       f.flat_number,
       f.floor,
       f.configuration,
       c.name            AS customer_name,
       c.phone           AS customer_phone,
       b.booking_date,
       b.final_value     AS booking_value
     FROM broker_commissions bc
     JOIN bookings   b  ON b.id = bc.booking_id
     JOIN projects   p  ON p.id = b.project_id
     JOIN flats      f  ON f.id = b.flat_id
     JOIN customers  c  ON c.id = b.customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.booking_date DESC`,
    params
  );
  return rows;
};

// ─── Aggregated summary for one broker ────────────────────────────────────────
const getBrokerCommissionSummary = async (brokerId) => {
  const { rows: brokerRows } = await db.query(
    `SELECT * FROM brokers WHERE id = $1`, [brokerId]
  );
  if (!brokerRows[0]) throw Object.assign(new Error('Broker not found'), { status: 404 });

  const { rows: totals } = await db.query(
    `SELECT
       COUNT(*)                                                  AS total_deals,
       COALESCE(SUM(commission_amount), 0)                       AS total_commission_amount,
       COALESCE(SUM(paid_amount), 0)                             AS total_paid,
       COALESCE(SUM(commission_amount), 0)
         - COALESCE(SUM(paid_amount), 0)                         AS total_pending,
       COUNT(*) FILTER (WHERE status = 'paid')                   AS deals_fully_paid,
       COUNT(*) FILTER (WHERE status = 'partial')                AS deals_partial,
       COUNT(*) FILTER (WHERE status = 'pending')                AS deals_pending,
       COALESCE(SUM(commission_amount)
         FILTER (WHERE status = 'paid'), 0)                      AS paid_commission_value
     FROM broker_commissions
     WHERE broker_id = $1`,
    [brokerId]
  );

  // Project-wise breakdown
  const { rows: byProject } = await db.query(
    `SELECT
       p.name                            AS project_name,
       COUNT(bc.id)                      AS deals,
       SUM(bc.commission_amount)         AS commission_amount,
       SUM(bc.paid_amount)               AS paid_amount,
       SUM(bc.commission_amount)
         - SUM(bc.paid_amount)           AS pending_amount
     FROM broker_commissions bc
     JOIN bookings b ON b.id = bc.booking_id
     JOIN projects p ON p.id = b.project_id
     WHERE bc.broker_id = $1
     GROUP BY p.id, p.name
     ORDER BY commission_amount DESC`,
    [brokerId]
  );

  return {
    broker:     brokerRows[0],
    totals:     totals[0],
    by_project: byProject,
  };
};

// ─── Create commission record for a booking ────────────────────────────────────
const createCommission = async (brokerId, data, userId) => {
  const { booking_id, commission_pct, remarks } = data;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Validate booking exists, is not cancelled, and belongs to this broker
    const { rows: bookingRows } = await client.query(
      `SELECT b.id, b.final_value, b.broker_id, b.status
       FROM bookings b WHERE b.id = $1`,
      [booking_id]
    );
    if (!bookingRows[0])
      throw Object.assign(new Error('Booking not found'), { status: 404 });
    if (bookingRows[0].status === 'cancelled')
      throw Object.assign(new Error('Cannot create commission for a cancelled booking'), { status: 400 });
    if (bookingRows[0].broker_id !== parseInt(brokerId))
      throw Object.assign(
        new Error('This broker is not linked to that booking'),
        { status: 400 }
      );

    const final_value       = parseFloat(bookingRows[0].final_value || 0);
    const pct               = parseFloat(commission_pct);
    const commission_amount = parseFloat(((final_value * pct) / 100).toFixed(2));

    const { rows } = await client.query(
      `INSERT INTO broker_commissions
         (booking_id, broker_id, commission_pct, commission_amount,
          balance_payable, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (booking_id, broker_id) DO NOTHING
       RETURNING *`,
      [
        booking_id, brokerId, pct, commission_amount,
        commission_amount,   // initially balance = full amount
        remarks || null, userId,
      ]
    );
    if (!rows[0])
      throw Object.assign(
        new Error('A commission record already exists for this broker and booking'),
        { status: 409 }
      );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── Pay commission (partial or full) ─────────────────────────────────────────
const payCommission = async (brokerId, commissionId, data, userId) => {
  const { amount, payment_date, payment_mode, payment_reference, remarks } = data;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Lock commission row
    const { rows: commRows } = await client.query(
      `SELECT * FROM broker_commissions
       WHERE id = $1 AND broker_id = $2
       FOR UPDATE`,
      [commissionId, brokerId]
    );
    if (!commRows[0])
      throw Object.assign(new Error('Commission record not found'), { status: 404 });
    if (commRows[0].status === 'paid')
      throw Object.assign(new Error('Commission is already fully paid'), { status: 400 });

    const commission      = commRows[0];
    const new_paid_total  = parseFloat(commission.paid_amount) + parseFloat(amount);
    const balance_payable = parseFloat(commission.commission_amount) - new_paid_total;

    if (new_paid_total > parseFloat(commission.commission_amount))
      throw Object.assign(
        new Error(
          `Payment ₹${amount} exceeds remaining balance of ₹${commission.balance_payable}`
        ),
        { status: 400 }
      );

    // Determine new status
    const new_status = balance_payable <= 0 ? 'paid' : 'partial';

    // 1. Update commission totals
    await client.query(
      `UPDATE broker_commissions
       SET paid_amount     = $1,
           balance_payable = $2,
           status          = $3,
           payment_date    = $4,
           payment_mode    = $5,
           payment_reference = $6,
           updated_at      = NOW()
       WHERE id = $7`,
      [
        new_paid_total.toFixed(2),
        balance_payable.toFixed(2),
        new_status,
        payment_date || new Date(),
        payment_mode || null,
        payment_reference || null,
        commissionId,
      ]
    );

    // 2. Log this payment installment
    const { rows: logRows } = await client.query(
      `INSERT INTO broker_commission_payments
         (commission_id, payment_date, amount, payment_mode, payment_reference, remarks, paid_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        commissionId,
        payment_date || new Date(),
        amount,
        payment_mode || null,
        payment_reference || null,
        remarks || null,
        userId,
      ]
    );

    await client.query('COMMIT');

    return {
      commission_id:    parseInt(commissionId),
      new_status,
      amount_paid_now:  parseFloat(amount),
      total_paid:       parseFloat(new_paid_total.toFixed(2)),
      balance_payable:  parseFloat(balance_payable.toFixed(2)),
      payment_log:      logRows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── Full payment history for one commission record ────────────────────────────
const getCommissionPayments = async (commissionId) => {
  const { rows } = await db.query(
    `SELECT
       bcp.*,
       u.name AS paid_by_name
     FROM broker_commission_payments bcp
     LEFT JOIN users u ON u.id = bcp.paid_by
     WHERE bcp.commission_id = $1
     ORDER BY bcp.payment_date ASC`,
    [commissionId]
  );
  return rows;
};

module.exports = {
  getAll, getSummary, getById, create, update, setActive,
  getAllCommissions, getPendingCommissions,
  getBrokerCommissions, getBrokerCommissionSummary,
  createCommission, payCommission, getCommissionPayments,
};