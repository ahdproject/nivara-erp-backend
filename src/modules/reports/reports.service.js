const db = require('../../config/db');

// ══════════════════════════════════════════════════════════════
// MAIN DASHBOARD — Single API call for the home screen
// ══════════════════════════════════════════════════════════════

const getDashboard = async () => {

  // ── 1. Flat Inventory Counters ─────────────────────────────
  const { rows: flatStats } = await db.query(
    `SELECT
       COUNT(*)                                            AS total_flats,
       COUNT(*) FILTER (WHERE f.status = 'available')     AS available_flats,
       COUNT(*) FILTER (WHERE f.status = 'blocked')       AS blocked_flats,
       COUNT(*) FILTER (WHERE f.status = 'sold')          AS sold_flats,
       COALESCE(SUM(f.total_price), 0)                    AS total_inventory_value,
       COALESCE(SUM(f.total_price)
         FILTER (WHERE f.status = 'sold'), 0)             AS sold_inventory_value,
       COALESCE(SUM(f.total_price)
         FILTER (WHERE f.status = 'available'), 0)        AS available_inventory_value
     FROM flats f`
  );

  // ── 2. Sales / Booking Counters ───────────────────────────
  const { rows: salesStats } = await db.query(
    `SELECT
       COUNT(*)                                                    AS total_bookings,
       COUNT(*) FILTER (WHERE b.status = 'booked')                AS booked,
       COUNT(*) FILTER (WHERE b.status = 'agreement_signed')      AS agreement_signed,
       COUNT(*) FILTER (WHERE b.status = 'registered')            AS registered,
       COUNT(*) FILTER (WHERE b.status = 'cancelled')             AS cancelled,
       COALESCE(SUM(b.final_value)
         FILTER (WHERE b.status != 'cancelled'), 0)               AS total_sales_value
     FROM bookings b`
  );

  // ── 3. Collection Counters ────────────────────────────────
  const { rows: collectionStats } = await db.query(
    `SELECT
       COALESCE(SUM(py.amount), 0)                                AS total_amount_received,
       COALESCE(SUM(b.final_value)
         FILTER (WHERE b.status != 'cancelled'), 0)
         - COALESCE(SUM(py.amount), 0)                           AS total_amount_pending
     FROM bookings b
     LEFT JOIN payments py ON py.booking_id = b.id`
  );

  // ── 4. Overdue Milestones Count ───────────────────────────
  const { rows: overdueStats } = await db.query(
    `SELECT
       COUNT(*)                        AS overdue_milestones,
       COALESCE(SUM(ps.amount
         - COALESCE(paid.paid, 0)), 0) AS overdue_amount
     FROM payment_schedules ps
     JOIN bookings b ON b.id = ps.booking_id AND b.status != 'cancelled'
     LEFT JOIN (
       SELECT schedule_id, SUM(amount) AS paid
       FROM payments GROUP BY schedule_id
     ) paid ON paid.schedule_id = ps.id
     WHERE ps.due_date < CURRENT_DATE AND ps.status != 'paid'`
  );

  // ── 5. Total Project Expenses ─────────────────────────────
  const { rows: expenseStats } = await db.query(
    `SELECT
       COALESCE(SUM(e.amount), 0)  AS total_expenses,
       COALESCE(SUM(e.gst), 0)     AS expenses_gst
     FROM project_expenses e`
  );

  // ── 6. This Month's Collections ───────────────────────────
  const { rows: thisMonth } = await db.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS collected_this_month,
       COUNT(*)                 AS payments_this_month
     FROM payments
     WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR  FROM payment_date) = EXTRACT(YEAR  FROM CURRENT_DATE)`
  );

  // ── 7. Per-Project Summary Cards ──────────────────────────
  const { rows: perProject } = await db.query(
    `SELECT
       p.id                                                          AS project_id,
       p.name                                                        AS project_name,
       p.project_status,
       COUNT(DISTINCT f.id)                                          AS total_flats,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'available')   AS available,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'blocked')     AS blocked,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'sold')        AS sold,
       COALESCE(SUM(b.final_value)
         FILTER (WHERE b.status != 'cancelled'), 0)                  AS sales_value,
       COALESCE(SUM(py.amount), 0)                                   AS collected,
       COALESCE(SUM(b.final_value)
         FILTER (WHERE b.status != 'cancelled'), 0)
         - COALESCE(SUM(py.amount), 0)                               AS pending
     FROM projects p
     LEFT JOIN flats    f  ON f.project_id = p.id
     LEFT JOIN bookings b  ON b.project_id = p.id
     LEFT JOIN payments py ON py.booking_id = b.id
     GROUP BY p.id, p.name, p.project_status
     ORDER BY p.created_at ASC`
  );

  // ── 8. Broker Commission Pending ──────────────────────────
  const { rows: brokerStats } = await db.query(
    `SELECT
       COALESCE(SUM(commission_amount), 0)             AS total_commission_payable,
       COALESCE(SUM(paid_amount), 0)                   AS total_commission_paid,
       COALESCE(SUM(commission_amount), 0)
         - COALESCE(SUM(paid_amount), 0)               AS total_commission_pending
     FROM broker_commissions`
  );

  return {
    generated_at:     new Date().toISOString(),
    flats:            flatStats[0],
    sales:            salesStats[0],
    collections:      collectionStats[0],
    overdue:          overdueStats[0],
    expenses:         expenseStats[0],
    this_month:       thisMonth[0],
    broker_commissions: brokerStats[0],
    projects:         perProject,
  };
};

// ══════════════════════════════════════════════════════════════
// PROJECT REPORT — Full P&L snapshot for a single project
// ══════════════════════════════════════════════════════════════

const getProjectReport = async (projectId) => {

  const { rows: projectRows } = await db.query(
    `SELECT * FROM projects WHERE id = $1`, [projectId]
  );
  if (!projectRows[0])
    throw Object.assign(new Error('Project not found'), { status: 404 });

  // Flat inventory breakdown
  const { rows: inventory } = await db.query(
    `SELECT
       COUNT(*)                                           AS total_flats,
       COUNT(*) FILTER (WHERE status = 'available')      AS available,
       COUNT(*) FILTER (WHERE status = 'blocked')        AS blocked,
       COUNT(*) FILTER (WHERE status = 'sold')           AS sold,
       COALESCE(SUM(total_price), 0)                     AS total_inventory_value,
       COALESCE(SUM(total_price)
         FILTER (WHERE status = 'sold'), 0)              AS sold_value,
       COALESCE(SUM(total_price)
         FILTER (WHERE status = 'available'), 0)         AS available_value
     FROM flats WHERE project_id = $1`,
    [projectId]
  );

  // Configuration-wise breakdown
  const { rows: byConfig } = await db.query(
    `SELECT
       configuration,
       COUNT(*)                                           AS total,
       COUNT(*) FILTER (WHERE status = 'available')      AS available,
       COUNT(*) FILTER (WHERE status = 'blocked')        AS blocked,
       COUNT(*) FILTER (WHERE status = 'sold')           AS sold,
       COALESCE(AVG(total_price), 0)                     AS avg_price,
       COALESCE(SUM(total_price)
         FILTER (WHERE status = 'sold'), 0)              AS sold_value
     FROM flats
     WHERE project_id = $1
     GROUP BY configuration
     ORDER BY configuration`,
    [projectId]
  );

  // Sales and collections
  const { rows: salesColl } = await db.query(
    `SELECT
       COUNT(b.id)                                              AS total_bookings,
       COALESCE(SUM(b.final_value)
         FILTER (WHERE b.status != 'cancelled'), 0)            AS total_sales_value,
       COALESCE(SUM(py.amount), 0)                             AS total_collected,
       COALESCE(SUM(b.final_value)
         FILTER (WHERE b.status != 'cancelled'), 0)
         - COALESCE(SUM(py.amount), 0)                         AS total_pending
     FROM bookings b
     LEFT JOIN payments py ON py.booking_id = b.id
     WHERE b.project_id = $1`,
    [projectId]
  );

  // Total project expenses
  const { rows: expenses } = await db.query(
    `SELECT
       COALESCE(SUM(e.total_amount), 0)                        AS total_expenses,
       COALESCE(SUM(e.paid_amount), 0)                         AS expenses_paid,
       COALESCE(SUM(e.total_amount), 0)
         - COALESCE(SUM(e.paid_amount), 0)                     AS expenses_pending,
       json_agg(
         jsonb_build_object(
           'category', ec.name,
           'total',    cat_totals.total_amount
         ) ORDER BY cat_totals.total_amount DESC
       ) AS by_category
     FROM project_expenses e
     JOIN expense_categories ec ON ec.id = e.category_id
     JOIN (
       SELECT category_id, SUM(total_amount) AS total_amount
       FROM project_expenses WHERE project_id = $1
       GROUP BY category_id
     ) cat_totals ON cat_totals.category_id = e.category_id
     WHERE e.project_id = $1`,
    [projectId]
  );

  // Broker commissions for this project
  const { rows: brokerComm } = await db.query(
    `SELECT
       COALESCE(SUM(bc.commission_amount), 0)   AS total_commission,
       COALESCE(SUM(bc.paid_amount), 0)         AS commission_paid,
       COALESCE(SUM(bc.commission_amount), 0)
         - COALESCE(SUM(bc.paid_amount), 0)     AS commission_pending
     FROM broker_commissions bc
     JOIN bookings b ON b.id = bc.booking_id
     WHERE b.project_id = $1`,
    [projectId]
  );

  // Gross profit calculation
  const total_sales   = parseFloat(salesColl[0].total_sales_value  || 0);
  const total_expense = parseFloat(expenses[0].total_expenses       || 0);
  const gross_profit  = total_sales - total_expense;

  return {
    project:       projectRows[0],
    inventory:     inventory[0],
    by_config:     byConfig,
    sales: {
      ...salesColl[0],
      gross_profit:        parseFloat(gross_profit.toFixed(2)),
      gross_profit_margin: total_sales
        ? parseFloat(((gross_profit / total_sales) * 100).toFixed(2))
        : 0,
    },
    expenses:      expenses[0],
    broker_commissions: brokerComm[0],
    generated_at:  new Date().toISOString(),
  };
};

// ══════════════════════════════════════════════════════════════
// SALES REPORT
// ══════════════════════════════════════════════════════════════

const getSalesReport = async ({ project_id, from_date, to_date } = {}) => {
  const conditions = [`b.status != 'cancelled'`];
  const params     = [];
  let   i = 1;

  if (project_id) { conditions.push(`b.project_id = $${i++}`);   params.push(project_id); }
  if (from_date)  { conditions.push(`b.booking_date >= $${i++}`); params.push(from_date); }
  if (to_date)    { conditions.push(`b.booking_date <= $${i++}`); params.push(to_date); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  // Totals
  const { rows: totals } = await db.query(
    `SELECT
       COUNT(b.id)                                   AS total_bookings,
       COALESCE(SUM(b.final_value), 0)               AS total_sales_value,
       COALESCE(SUM(b.discount), 0)                  AS total_discount,
       COALESCE(SUM(b.agreement_value), 0)           AS total_agreement_value,
       COUNT(*) FILTER (WHERE b.status='registered') AS registered_count,
       COUNT(*) FILTER (WHERE b.status='booked')     AS booked_count,
       COUNT(*) FILTER (WHERE b.status='agreement_signed') AS agreement_signed_count
     FROM bookings b
     ${where}`,
    params
  );

  // Sales by configuration
  const { rows: byConfig } = await db.query(
    `SELECT
       f.configuration,
       COUNT(b.id)                      AS units_sold,
       COALESCE(SUM(b.final_value), 0)  AS sales_value,
       COALESCE(AVG(b.final_value), 0)  AS avg_sale_price
     FROM bookings b
     JOIN flats f ON f.id = b.flat_id
     ${where}
     GROUP BY f.configuration
     ORDER BY sales_value DESC`,
    params
  );

  // Sales by project
  const { rows: byProject } = await db.query(
    `SELECT
       p.name                           AS project_name,
       COUNT(b.id)                      AS units_sold,
       COALESCE(SUM(b.final_value), 0)  AS sales_value
     FROM bookings b
     JOIN projects p ON p.id = b.project_id
     ${where}
     GROUP BY p.id, p.name
     ORDER BY sales_value DESC`,
    params
  );

  // Recent bookings list
  const { rows: recent } = await db.query(
    `SELECT
       b.id, b.booking_date, b.final_value, b.status,
       p.name    AS project_name,
       f.flat_number, f.configuration,
       c.name    AS customer_name,
       c.phone   AS customer_phone
     FROM bookings b
     JOIN projects  p ON p.id = b.project_id
     JOIN flats     f ON f.id = b.flat_id
     JOIN customers c ON c.id = b.customer_id
     ${where}
     ORDER BY b.booking_date DESC
     LIMIT 20`,
    params
  );

  return {
    totals:     totals[0],
    by_config:  byConfig,
    by_project: byProject,
    recent_bookings: recent,
  };
};

// ══════════════════════════════════════════════════════════════
// MONTHLY SALES TREND — 12 months for a given year
// ══════════════════════════════════════════════════════════════

const getMonthlySales = async (year) => {
  const { rows } = await db.query(
    `SELECT
       EXTRACT(MONTH FROM b.booking_date)                              AS month_number,
       TO_CHAR(DATE_TRUNC('month', b.booking_date), 'Mon')            AS month_label,
       COUNT(b.id)                                                     AS bookings,
       COALESCE(SUM(b.final_value), 0)                                AS sales_value
     FROM bookings b
     WHERE EXTRACT(YEAR FROM b.booking_date) = $1
       AND b.status != 'cancelled'
     GROUP BY EXTRACT(MONTH FROM b.booking_date),
              DATE_TRUNC('month', b.booking_date)
     ORDER BY month_number ASC`,
    [year]
  );
  return { year: parseInt(year), monthly_sales: rows };
};

// ══════════════════════════════════════════════════════════════
// COLLECTION REPORT
// ══════════════════════════════════════════════════════════════

const getCollectionReport = async ({ project_id, from_date, to_date } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (project_id) { conditions.push(`b.project_id    = $${i++}`);   params.push(project_id); }
  if (from_date)  { conditions.push(`py.payment_date >= $${i++}`);   params.push(from_date); }
  if (to_date)    { conditions.push(`py.payment_date <= $${i++}`);   params.push(to_date); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Totals
  const { rows: totals } = await db.query(
    `SELECT
       COUNT(py.id)                                                              AS payment_count,
       COALESCE(SUM(py.amount), 0)                                              AS total_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_type='booking'), 0)     AS booking_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_type='agreement'), 0)   AS agreement_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_type='instalment'), 0)  AS instalment_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_type='registration'), 0) AS registration_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_mode='cash'), 0)        AS cash_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_mode='cheque'), 0)      AS cheque_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_mode='NEFT'), 0)        AS neft_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_mode='RTGS'), 0)        AS rtgs_collected,
       COALESCE(SUM(py.amount) FILTER (WHERE py.payment_mode='UPI'), 0)         AS upi_collected
     FROM payments py
     JOIN bookings b ON b.id = py.booking_id
     ${where}`,
    params
  );

  // Outstanding per booking
  const { rows: outstanding } = await db.query(
    `SELECT
       b.id              AS booking_id,
       p.name            AS project_name,
       f.flat_number,
       f.configuration,
       c.name            AS customer_name,
       c.phone,
       b.final_value,
       COALESCE(SUM(py.amount), 0)                    AS total_paid,
       b.final_value - COALESCE(SUM(py.amount), 0)    AS balance_due,
       ROUND(COALESCE(SUM(py.amount), 0)
         / NULLIF(b.final_value, 0) * 100, 2)         AS percent_paid
     FROM bookings b
     JOIN projects  p  ON p.id = b.project_id
     JOIN flats     f  ON f.id = b.flat_id
     JOIN customers c  ON c.id = b.customer_id
     LEFT JOIN payments py ON py.booking_id = b.id
     WHERE b.status != 'cancelled'
       AND b.final_value IS NOT NULL
     GROUP BY b.id, p.name, f.flat_number, f.configuration,
              c.name, c.phone
     HAVING b.final_value - COALESCE(SUM(py.amount), 0) > 0
     ORDER BY balance_due DESC
     LIMIT 20`,
    []
  );

  return {
    totals:         totals[0],
    top_outstanding: outstanding,
  };
};

// ══════════════════════════════════════════════════════════════
// MONTHLY COLLECTIONS TREND
// ══════════════════════════════════════════════════════════════

const getMonthlyCollections = async (year) => {
  const { rows } = await db.query(
    `SELECT
       EXTRACT(MONTH FROM py.payment_date)                         AS month_number,
       TO_CHAR(DATE_TRUNC('month', py.payment_date), 'Mon')        AS month_label,
       COUNT(py.id)                                                AS payment_count,
       COALESCE(SUM(py.amount), 0)                                 AS total_collected
     FROM payments py
     WHERE EXTRACT(YEAR FROM py.payment_date) = $1
     GROUP BY EXTRACT(MONTH FROM py.payment_date),
              DATE_TRUNC('month', py.payment_date)
     ORDER BY month_number ASC`,
    [year]
  );
  return { year: parseInt(year), monthly_collections: rows };
};

// ══════════════════════════════════════════════════════════════
// EXPENSE REPORT
// ══════════════════════════════════════════════════════════════

const getExpenseReport = async ({ project_id, from_date, to_date } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (project_id) { conditions.push(`e.project_id    = $${i++}`); params.push(project_id); }
  if (from_date)  { conditions.push(`e.expense_date >= $${i++}`); params.push(from_date); }
  if (to_date)    { conditions.push(`e.expense_date <= $${i++}`); params.push(to_date); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Totals
  const { rows: totals } = await db.query(
    `SELECT
       COUNT(*)                              AS entry_count,
       COALESCE(SUM(e.amount), 0)            AS total_base_amount,
       COALESCE(SUM(e.gst_amount), 0)        AS total_gst,
       COALESCE(SUM(e.total_amount), 0)      AS total_expense,
       COALESCE(SUM(e.paid_amount), 0)       AS total_paid,
       COALESCE(SUM(e.total_amount), 0)
         - COALESCE(SUM(e.paid_amount), 0)   AS total_pending
     FROM project_expenses e
     ${where}`,
    params
  );

  // By category
  const { rows: byCategory } = await db.query(
    `SELECT
       ec.name                               AS category,
       COUNT(e.id)                           AS entry_count,
       COALESCE(SUM(e.total_amount), 0)      AS total_amount,
       COALESCE(SUM(e.paid_amount), 0)       AS paid_amount,
       COALESCE(SUM(e.total_amount), 0)
         - COALESCE(SUM(e.paid_amount), 0)   AS pending_amount,
       ROUND(
         COALESCE(SUM(e.total_amount), 0)
           / NULLIF(SUM(SUM(e.total_amount)) OVER (), 0) * 100
       , 2)                                  AS percentage_of_total
     FROM project_expenses e
     JOIN expense_categories ec ON ec.id = e.category_id
     ${where}
     GROUP BY ec.id, ec.name
     ORDER BY total_amount DESC`,
    params
  );

  // By project (when no project filter)
  let byProject = [];
  if (!project_id) {
    const { rows } = await db.query(
      `SELECT
         p.name                              AS project_name,
         COALESCE(SUM(e.total_amount), 0)   AS total_amount,
         COALESCE(SUM(e.paid_amount), 0)    AS paid_amount
       FROM project_expenses e
       JOIN projects p ON p.id = e.project_id
       GROUP BY p.id, p.name
       ORDER BY total_amount DESC`
    );
    byProject = rows;
  }

  return {
    totals:      totals[0],
    by_category: byCategory,
    by_project:  byProject,
  };
};

// ══════════════════════════════════════════════════════════════
// BROKER PERFORMANCE REPORT
// ══════════════════════════════════════════════════════════════

const getBrokerPerformance = async ({ project_id } = {}) => {
  const conditions = [`b.status != 'cancelled'`];
  const params     = [];
  let   i = 1;

  if (project_id) { conditions.push(`b.project_id = $${i++}`); params.push(project_id); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows } = await db.query(
    `SELECT
       br.id                                           AS broker_id,
       br.name                                         AS broker_name,
       br.phone,
       br.company,
       COUNT(DISTINCT b.id)                            AS total_deals,
       COALESCE(SUM(b.final_value), 0)                 AS total_sales_value,
       COALESCE(SUM(bc.commission_amount), 0)          AS total_commission_earned,
       COALESCE(SUM(bc.paid_amount), 0)                AS commission_paid,
       COALESCE(SUM(bc.commission_amount), 0)
         - COALESCE(SUM(bc.paid_amount), 0)            AS commission_pending,
       COALESCE(AVG(bc.commission_pct), 0)             AS avg_commission_pct,
       ROUND(
         COALESCE(SUM(b.final_value), 0)
           / NULLIF(SUM(SUM(b.final_value)) OVER (), 0) * 100
       , 2)                                            AS sales_contribution_pct
     FROM brokers br
     JOIN bookings b ON b.broker_id = br.id
     LEFT JOIN broker_commissions bc ON bc.broker_id = br.id AND bc.booking_id = b.id
     ${where}
     GROUP BY br.id, br.name, br.phone, br.company
     ORDER BY total_sales_value DESC`,
    params
  );
  return { brokers: rows, total: rows.length };
};

// ══════════════════════════════════════════════════════════════
// FLAT INVENTORY SNAPSHOT
// ══════════════════════════════════════════════════════════════

const getInventorySnapshot = async ({ project_id } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (project_id) { conditions.push(`f.project_id = $${i++}`); params.push(project_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Floor-wise snapshot
  const { rows: byFloor } = await db.query(
    `SELECT
       p.name                                           AS project_name,
       f.floor,
       COUNT(*)                                         AS total_units,
       COUNT(*) FILTER (WHERE f.status = 'available')  AS available,
       COUNT(*) FILTER (WHERE f.status = 'blocked')    AS blocked,
       COUNT(*) FILTER (WHERE f.status = 'sold')       AS sold
     FROM flats f
     JOIN projects p ON p.id = f.project_id
     ${where}
     GROUP BY p.id, p.name, f.floor
     ORDER BY p.name, f.floor ASC`,
    params
  );

  // Configuration-wise snapshot
  const { rows: byConfig } = await db.query(
    `SELECT
       f.configuration,
       COUNT(*)                                         AS total_units,
       COUNT(*) FILTER (WHERE f.status = 'available')  AS available,
       COUNT(*) FILTER (WHERE f.status = 'blocked')    AS blocked,
       COUNT(*) FILTER (WHERE f.status = 'sold')       AS sold,
       COALESCE(AVG(f.carpet_area), 0)                 AS avg_carpet_area,
       COALESCE(AVG(f.saleable_area), 0)               AS avg_saleable_area,
       COALESCE(AVG(f.total_price), 0)                 AS avg_price
     FROM flats f
     ${where}
     GROUP BY f.configuration
     ORDER BY f.configuration`,
    params
  );

  // Overall totals
  const { rows: totals } = await db.query(
    `SELECT
       COUNT(*)                                         AS total_flats,
       COUNT(*) FILTER (WHERE f.status = 'available')  AS available,
       COUNT(*) FILTER (WHERE f.status = 'blocked')    AS blocked,
       COUNT(*) FILTER (WHERE f.status = 'sold')       AS sold,
       COALESCE(SUM(f.total_price), 0)                 AS total_value,
       COALESCE(SUM(f.total_price)
         FILTER (WHERE f.status = 'sold'), 0)          AS sold_value,
       COALESCE(SUM(f.total_price)
         FILTER (WHERE f.status = 'available'), 0)     AS available_value
     FROM flats f
     ${where}`,
    params
  );

  return {
    totals:    totals[0],
    by_floor:  byFloor,
    by_config: byConfig,
  };
};

module.exports = {
  getDashboard,
  getProjectReport,
  getSalesReport, getMonthlySales,
  getCollectionReport, getMonthlyCollections,
  getExpenseReport,
  getBrokerPerformance,
  getInventorySnapshot,
};