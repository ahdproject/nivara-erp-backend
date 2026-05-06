const db = require('../../config/db');

// ─── Get All Flats (with filters) ─────────────────────────────────────────────
const getAll = async ({ project_id, status, floor, configuration, facing } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (project_id)    { conditions.push(`f.project_id   = $${i++}`); params.push(project_id); }
  if (status)        { conditions.push(`f.status        = $${i++}`); params.push(status); }
  if (floor)         { conditions.push(`f.floor         = $${i++}`); params.push(floor); }
  if (configuration) { conditions.push(`f.configuration = $${i++}`); params.push(configuration); }
  if (facing)        { conditions.push(`f.facing        = $${i++}`); params.push(facing); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
       f.*,
       p.name           AS project_name,
       c.name           AS buyer_name,
       c.phone          AS buyer_phone,
       b.id             AS booking_id,
       b.agreement_value,
       b.final_value
     FROM flats f
     LEFT JOIN projects  p ON p.id = f.project_id
     LEFT JOIN bookings  b ON b.flat_id = f.id AND b.status != 'cancelled'
     LEFT JOIN customers c ON c.id = b.customer_id
     ${where}
     ORDER BY f.floor ASC, f.flat_number ASC`,
    params
  );
  return rows;
};

// ─── Inventory Stats per Project ───────────────────────────────────────────────
const getStats = async (project_id) => {
  const params = [];
  const where  = project_id ? `WHERE f.project_id = $1` : '';
  if (project_id) params.push(project_id);

  const { rows } = await db.query(
    `SELECT
       COUNT(*)                                           AS total_flats,
       COUNT(*) FILTER (WHERE f.status = 'available')    AS available,
       COUNT(*) FILTER (WHERE f.status = 'blocked')      AS blocked,
       COUNT(*) FILTER (WHERE f.status = 'sold')         AS sold,
       COALESCE(SUM(f.total_price), 0)                   AS total_inventory_value,
       COALESCE(SUM(f.total_price) FILTER (WHERE f.status = 'sold'), 0)  AS sold_value,
       COALESCE(SUM(f.total_price) FILTER (WHERE f.status = 'available'), 0) AS available_value
     FROM flats f
     ${where}`,
    params
  );
  
  // Get configuration breakdown separately
  let configBreakdown = [];
  if (rows[0]) {
    const configQuery = project_id 
      ? `SELECT f.configuration, COUNT(*) as total, 
              COUNT(*) FILTER (WHERE f.status = 'sold') as sold,
              COUNT(*) FILTER (WHERE f.status = 'available') as available
         FROM flats f
         WHERE f.project_id = $1 AND f.configuration IS NOT NULL
         GROUP BY f.configuration`
      : `SELECT f.configuration, COUNT(*) as total, 
              COUNT(*) FILTER (WHERE f.status = 'sold') as sold,
              COUNT(*) FILTER (WHERE f.status = 'available') as available
         FROM flats f
         WHERE f.configuration IS NOT NULL
         GROUP BY f.configuration`;
    
    const { rows: configRows } = await db.query(configQuery, params);
    configBreakdown = configRows;
  }
  
  return { ...rows[0], by_configuration: configBreakdown };
};

// ─── Get Single Flat ───────────────────────────────────────────────────────────
const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT
       f.*,
       p.name           AS project_name,
       p.sector_location,
       c.name           AS buyer_name,
       c.phone          AS buyer_phone,
       c.email          AS buyer_email,
       b.id             AS booking_id,
       b.booking_date,
       b.agreement_value,
       b.final_value,
       b.status         AS booking_status
     FROM flats f
     LEFT JOIN projects  p ON p.id = f.project_id
     LEFT JOIN bookings  b ON b.flat_id = f.id AND b.status != 'cancelled'
     LEFT JOIN customers c ON c.id = b.customer_id
     WHERE f.id = $1`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Flat not found'), { status: 404 });
  return rows[0];
};

// ─── Create Single Flat ────────────────────────────────────────────────────────
const create = async (data) => {
  const {
    project_id, flat_number, floor, configuration,
    carpet_area, saleable_area, area_unit,
    base_price, total_price,
    facing, parking, remarks,
  } = data;

  const computed_total = total_price || (saleable_area && base_price
    ? parseFloat(saleable_area) * parseFloat(base_price)
    : null);

  const { rows } = await db.query(
    `INSERT INTO flats
       (project_id, flat_number, floor, configuration,
        carpet_area, saleable_area, area_unit,
        base_price, total_price,
        facing, parking, remarks)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      project_id, flat_number, floor, configuration,
      carpet_area, saleable_area, area_unit || 'sqft',
      base_price, computed_total,
      facing, parking, remarks,
    ]
  );
  return rows[0];
};

// ─── Bulk Create Flats (e.g. auto-generate all units for a floor) ──────────────
const bulkCreate = async (flats = []) => {
  if (!flats.length) throw new Error('No flats provided');

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let created = 0;
    const results = [];

    for (const flat of flats) {
      const computed_total = flat.total_price || (flat.saleable_area && flat.base_price
        ? parseFloat(flat.saleable_area) * parseFloat(flat.base_price)
        : null);

      const { rows } = await client.query(
        `INSERT INTO flats
           (project_id, flat_number, floor, configuration,
            carpet_area, saleable_area, area_unit,
            base_price, total_price, facing, parking, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (project_id, flat_number) DO NOTHING
         RETURNING *`,
        [
          flat.project_id, flat.flat_number, flat.floor, flat.configuration,
          flat.carpet_area, flat.saleable_area, flat.area_unit || 'sqft',
          flat.base_price, computed_total,
          flat.facing, flat.parking, flat.remarks,
        ]
      );
      if (rows[0]) { results.push(rows[0]); created++; }
    }

    await client.query('COMMIT');
    return { created, skipped: flats.length - created, flats: results };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── Update Flat ───────────────────────────────────────────────────────────────
const update = async (id, data) => {
  const allowed = [
    'flat_number', 'floor', 'configuration',
    'carpet_area', 'saleable_area', 'area_unit',
    'base_price', 'total_price',
    'facing', 'parking', 'remarks',
  ];

  const fields = [];
  const values = [];
  let   i = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(data[key]);
    }
  }

  if (!fields.length) throw new Error('No valid fields provided for update');

  // Auto-recalculate total_price if area or price changed but total_price not explicitly sent
  if (!data.total_price && (data.saleable_area || data.base_price)) {
    fields.push(`total_price = saleable_area * base_price`);
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await db.query(
    `UPDATE flats SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw Object.assign(new Error('Flat not found'), { status: 404 });
  return rows[0];
};

// ─── Update Flat Status Only ───────────────────────────────────────────────────
const updateStatus = async (id, status) => {
  const valid = ['available', 'blocked', 'sold'];
  if (!valid.includes(status))
    throw Object.assign(new Error(`Status must be one of: ${valid.join(', ')}`), { status: 422 });

  // Prevent manual 'sold' override if no active booking exists
  if (status === 'sold') {
    const { rows } = await db.query(
      `SELECT id FROM bookings WHERE flat_id = $1 AND status NOT IN ('cancelled') LIMIT 1`,
      [id]
    );
    if (!rows[0]) throw Object.assign(
      new Error('Cannot mark flat as sold without an active booking'),
      { status: 400 }
    );
  }

  const { rows } = await db.query(
    `UPDATE flats SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Flat not found'), { status: 404 });
  return rows[0];
};

// ─── Delete Flat ───────────────────────────────────────────────────────────────
const remove = async (id) => {
  // Block delete if flat has a booking
  const { rows } = await db.query(
    `SELECT id FROM bookings WHERE flat_id = $1 AND status != 'cancelled' LIMIT 1`,
    [id]
  );
  if (rows[0]) throw Object.assign(
    new Error('Cannot delete flat with an active booking'),
    { status: 400 }
  );

  const { rowCount } = await db.query('DELETE FROM flats WHERE id = $1', [id]);
  if (!rowCount) throw Object.assign(new Error('Flat not found'), { status: 404 });
};

module.exports = {
  getAll, getStats, getById,
  create, bulkCreate,
  update, updateStatus, remove,
};