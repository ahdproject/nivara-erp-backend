const db = require('../../config/db');

// ══════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════

const getCategories = async () => {
  const { rows } = await db.query(
    `SELECT * FROM expense_categories ORDER BY is_active DESC, name ASC`
  );
  return rows;
};

const createCategory = async ({ name }) => {
  const { rows } = await db.query(
    `INSERT INTO expense_categories (name)
     VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET is_active = TRUE
     RETURNING *`,
    [name]
  );
  return rows[0];
};

const deactivateCategory = async (id) => {
  const { rows } = await db.query(
    `UPDATE expense_categories SET is_active = FALSE WHERE id = $1 RETURNING *`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Category not found'), { status: 404 });
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// EXPENSES — GET ALL (filtered)
// ══════════════════════════════════════════════════════════════

const getAll = async ({ project_id, category_id, from_date, to_date, vendor } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (project_id)     { conditions.push(`e.project_id     = $${i++}`); params.push(project_id); }
  if (category_id)    { conditions.push(`e.category_id    = $${i++}`); params.push(category_id); }
  if (from_date)      { conditions.push(`e.expense_date  >= $${i++}`); params.push(from_date); }
  if (to_date)        { conditions.push(`e.expense_date  <= $${i++}`); params.push(to_date); }
  if (vendor)         { conditions.push(`e.vendor ILIKE $${i++}`); params.push(`%${vendor}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
       e.*,
       p.name          AS project_name,
       ec.name         AS category_name,
       u.name          AS created_by_name
     FROM project_expenses e
     JOIN projects          p  ON p.id  = e.project_id
     JOIN expense_categories ec ON ec.id = e.category_id
     LEFT JOIN users        u  ON u.id  = e.created_by
     ${where}
     ORDER BY e.expense_date DESC, e.created_at DESC`,
    params
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// SUMMARY — across all projects or per project
// ══════════════════════════════════════════════════════════════

const getSummary = async ({ project_id } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (project_id) { conditions.push(`e.project_id = $${i++}`); params.push(project_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Overall totals
  const { rows: totals } = await db.query(
    `SELECT
       COUNT(*)                          AS total_entries,
       COALESCE(SUM(e.amount), 0)        AS total_expense,
       COALESCE(SUM(e.gst), 0)           AS total_gst,
       COALESCE(SUM(e.amount) + SUM(e.gst), 0) AS total_with_gst
     FROM project_expenses e
     ${where}`,
    params
  );

  // Breakdown by category
  const { rows: byCategory } = await db.query(
    `SELECT
       ec.name                      AS category,
       COUNT(e.id)                  AS entry_count,
       COALESCE(SUM(e.amount), 0)   AS total_amount,
       COALESCE(SUM(e.gst), 0)      AS total_gst
     FROM project_expenses e
     JOIN expense_categories ec ON ec.id = e.category_id
     ${where}
     GROUP BY ec.id, ec.name
     ORDER BY total_amount DESC`,
    params
  );

  // Breakdown by project (only when no specific project filter)
  let byProject = [];
  if (!project_id) {
    const { rows } = await db.query(
      `SELECT
         p.name                    AS project_name,
         COUNT(e.id)               AS entry_count,
         COALESCE(SUM(e.amount), 0) AS total_amount,
         COALESCE(SUM(e.gst), 0)   AS total_gst
       FROM project_expenses e
       JOIN projects p ON p.id = e.project_id
       GROUP BY p.id, p.name
       ORDER BY total_amount DESC`
    );
    byProject = rows;
  }

  // Monthly trend (last 12 months)
  const { rows: trend } = await db.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', e.expense_date), 'Mon YYYY') AS month_label,
       DATE_TRUNC('month', e.expense_date)                       AS month_start,
       COALESCE(SUM(e.amount), 0)                                AS total_amount
     FROM project_expenses e
     ${where}
     GROUP BY DATE_TRUNC('month', e.expense_date)
     ORDER BY month_start DESC
     LIMIT 12`,
    params
  );

  return {
    totals:      totals[0],
    by_category: byCategory,
    by_project:  byProject,
    monthly_trend: trend.reverse(),   // chronological order for charts
  };
};

// ══════════════════════════════════════════════════════════════
// UNPAID / PARTIAL EXPENSES
// ══════════════════════════════════════════════════════════════

const getUnpaid = async ({ project_id } = {}) => {
  const conditions = [`e.payment_status IN ('unpaid', 'partial')`];
  const params     = [];
  let   i = 1;

  if (project_id) { conditions.push(`e.project_id = $${i++}`); params.push(project_id); }

  const { rows } = await db.query(
    `SELECT
       e.*,
       p.name   AS project_name,
       ec.name  AS category_name
     FROM project_expenses e
     JOIN projects           p  ON p.id  = e.project_id
     JOIN expense_categories ec ON ec.id = e.category_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.expense_date ASC`,
    params
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// ALL EXPENSES FOR A PROJECT — with category-wise breakdown
// ══════════════════════════════════════════════════════════════

const getByProject = async (projectId, { category_id, from_date, to_date } = {}) => {
  const conditions = [`e.project_id = $1`];
  const params     = [projectId];
  let   i = 2;

  if (category_id) { conditions.push(`e.category_id  = $${i++}`); params.push(category_id); }
  if (from_date)   { conditions.push(`e.expense_date >= $${i++}`); params.push(from_date); }
  if (to_date)     { conditions.push(`e.expense_date <= $${i++}`); params.push(to_date); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  // All expense records
  const { rows: expenses } = await db.query(
    `SELECT
       e.*,
       ec.name  AS category_name,
       u.name   AS created_by_name
     FROM project_expenses  e
     JOIN expense_categories ec ON ec.id = e.category_id
     LEFT JOIN users         u  ON u.id  = e.created_by
     ${where}
     ORDER BY e.expense_date DESC`,
    params
  );

  // Category-wise totals for this project
  const { rows: byCategory } = await db.query(
    `SELECT
       ec.name                              AS category,
       COUNT(e.id)                          AS entry_count,
       COALESCE(SUM(e.total_amount), 0)     AS total_amount,
       COALESCE(SUM(e.paid_amount), 0)      AS paid_amount,
       COALESCE(SUM(e.total_amount), 0)
         - COALESCE(SUM(e.paid_amount), 0)  AS pending_amount
     FROM project_expenses  e
     JOIN expense_categories ec ON ec.id = e.category_id
     ${where}
     GROUP BY ec.id, ec.name
     ORDER BY total_amount DESC`,
    params
  );

  // Project-level totals
  const { rows: totals } = await db.query(
    `SELECT
       COALESCE(SUM(e.total_amount), 0)                                  AS total_expense,
       COALESCE(SUM(e.paid_amount), 0)                                   AS total_paid,
       COALESCE(SUM(e.total_amount), 0) - COALESCE(SUM(e.paid_amount), 0) AS total_pending,
       COALESCE(SUM(e.gst_amount), 0)                                    AS total_gst
     FROM project_expenses e
     ${where}`,
    params
  );

  return {
    project_id:  parseInt(projectId),
    totals:      totals[0],
    by_category: byCategory,
    expenses,
  };
};

// ══════════════════════════════════════════════════════════════
// GET SINGLE EXPENSE
// ══════════════════════════════════════════════════════════════

const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT
       e.*,
       p.name   AS project_name,
       ec.name  AS category_name,
       u.name   AS created_by_name
     FROM project_expenses  e
     JOIN projects           p  ON p.id  = e.project_id
     JOIN expense_categories ec ON ec.id = e.category_id
     LEFT JOIN users         u  ON u.id  = e.created_by
     WHERE e.id = $1`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Expense not found'), { status: 404 });
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// CREATE EXPENSE
// ══════════════════════════════════════════════════════════════

const create = async (data) => {
  const {
    project_id, category_id, vendor_name,
    description, expense_date, invoice_number,
    amount, gst_amount, payment_mode,
    payment_reference, remarks, created_by,
  } = data;

  const gst          = parseFloat(gst_amount || 0);
  const total_amount = parseFloat(amount) + gst;

  const { rows } = await db.query(
    `INSERT INTO project_expenses
       (project_id, category_id, vendor_name, description,
        expense_date, invoice_number, amount, gst_amount, total_amount,
        balance_payable, payment_mode, payment_reference,
        remarks, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      project_id, category_id, vendor_name || null,
      description || null, expense_date || new Date(),
      invoice_number || null, amount, gst, total_amount,
      total_amount,              // balance_payable starts equal to total
      payment_mode || null, payment_reference || null,
      remarks || null, created_by,
    ]
  );
  return getById(rows[0].id);
};

// ══════════════════════════════════════════════════════════════
// UPDATE EXPENSE
// ══════════════════════════════════════════════════════════════

const update = async (id, data) => {
  // Block update if expense has any payment recorded
  const { rows: existing } = await db.query(
    `SELECT e.*, COUNT(ep.id) AS payment_count
     FROM project_expenses e
     LEFT JOIN expense_payments ep ON ep.expense_id = e.id
     WHERE e.id = $1
     GROUP BY e.id`,
    [id]
  );
  if (!existing[0]) throw Object.assign(new Error('Expense not found'), { status: 404 });
  if (parseInt(existing[0].payment_count) > 0 && (data.amount || data.gst_amount))
    throw Object.assign(
      new Error('Cannot change amount after payments have been recorded. Delete payments first.'),
      { status: 400 }
    );

  const allowed = [
    'category_id', 'vendor_name', 'description',
    'expense_date', 'invoice_number',
    'payment_mode', 'payment_reference', 'remarks',
  ];
  const fields = [];
  const values = [];
  let   i = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) { fields.push(`${key} = $${i++}`); values.push(data[key]); }
  }

  // Handle amount/gst recalculation if allowed
  if (data.amount !== undefined || data.gst_amount !== undefined) {
    const new_amount = parseFloat(data.amount      ?? existing[0].amount);
    const new_gst    = parseFloat(data.gst_amount  ?? existing[0].gst_amount);
    const new_total  = new_amount + new_gst;
    fields.push(`amount = $${i++}`, `gst_amount = $${i++}`, `total_amount = $${i++}`, `balance_payable = $${i++}`);
    values.push(new_amount, new_gst, new_total, new_total);
  }

  if (!fields.length) throw new Error('No valid fields provided');

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await db.query(
    `UPDATE project_expenses SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return getById(rows[0].id);
};

// ══════════════════════════════════════════════════════════════
// DELETE EXPENSE
// ══════════════════════════════════════════════════════════════

const remove = async (id) => {
  const { rows } = await db.query(
    `SELECT COUNT(ep.id) AS payment_count
     FROM project_expenses e
     LEFT JOIN expense_payments ep ON ep.expense_id = e.id
     WHERE e.id = $1
     GROUP BY e.id`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Expense not found'), { status: 404 });
  if (parseInt(rows[0].payment_count) > 0)
    throw Object.assign(
      new Error('Cannot delete expense with recorded payments. Remove payments first.'),
      { status: 400 }
    );

  await db.query('DELETE FROM project_expenses WHERE id = $1', [id]);
};

// ══════════════════════════════════════════════════════════════
// PAY AGAINST AN EXPENSE (partial or full)
// ══════════════════════════════════════════════════════════════

const pay = async (id, data, userId) => {
  const { amount, payment_date, payment_mode, payment_reference, remarks } = data;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Lock the expense row
    const { rows } = await client.query(
      `SELECT * FROM project_expenses WHERE id = $1 FOR UPDATE`, [id]
    );
    if (!rows[0]) throw Object.assign(new Error('Expense not found'), { status: 404 });
    if (rows[0].payment_status === 'paid')
      throw Object.assign(new Error('Expense is already fully paid'), { status: 400 });

    const expense       = rows[0];
    const new_paid      = parseFloat(expense.paid_amount) + parseFloat(amount);
    const new_balance   = parseFloat(expense.total_amount) - new_paid;

    if (new_paid > parseFloat(expense.total_amount))
      throw Object.assign(
        new Error(`Payment ₹${amount} exceeds balance payable of ₹${expense.balance_payable}`),
        { status: 400 }
      );

    const new_status = new_balance <= 0 ? 'paid' : 'partial';

    // 1. Update expense totals
    await client.query(
      `UPDATE project_expenses
       SET paid_amount     = $1,
           balance_payable = $2,
           payment_status  = $3,
           payment_mode    = COALESCE($4, payment_mode),
           payment_reference = COALESCE($5, payment_reference),
           updated_at      = NOW()
       WHERE id = $6`,
      [
        new_paid.toFixed(2),
        new_balance.toFixed(2),
        new_status,
        payment_mode || null,
        payment_reference || null,
        id,
      ]
    );

    // 2. Log this payment installment
    const { rows: logRows } = await client.query(
      `INSERT INTO expense_payments
         (expense_id, payment_date, amount, payment_mode, payment_reference, remarks, paid_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        id,
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
      expense_id:      parseInt(id),
      new_status,
      amount_paid_now: parseFloat(amount),
      total_paid:      parseFloat(new_paid.toFixed(2)),
      balance_payable: parseFloat(new_balance.toFixed(2)),
      payment_log:     logRows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ══════════════════════════════════════════════════════════════
// PAYMENT HISTORY FOR AN EXPENSE
// ══════════════════════════════════════════════════════════════

const getPayments = async (expenseId) => {
  const { rows } = await db.query(
    `SELECT
       ep.*,
       u.name AS paid_by_name
     FROM expense_payments ep
     LEFT JOIN users u ON u.id = ep.paid_by
     WHERE ep.expense_id = $1
     ORDER BY ep.payment_date ASC`,
    [expenseId]
  );
  return rows;
};

module.exports = {
  getCategories, createCategory, deactivateCategory,
  getAll, getSummary, getUnpaid, getByProject,
  getById, create, update, remove,
  pay, getPayments,
};