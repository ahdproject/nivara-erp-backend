const db = require('../../config/db');

// ─── Get All Projects ─────────────────────────────────────────────────────────
const getAll = async ({ status, search } = {}) => {
  const conditions = [];
  const params     = [];
  let   i = 1;

  if (status) { conditions.push(`p.project_status = $${i++}`); params.push(status); }
  if (search) { conditions.push(`p.name ILIKE $${i++}`);        params.push(`%${search}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
       p.*,
       COUNT(DISTINCT f.id)                                              AS total_flats_listed,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'available')       AS flats_available,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'blocked')         AS flats_blocked,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'sold')            AS flats_sold,
       COALESCE(SUM(b.final_value) FILTER (WHERE b.status != 'cancelled'), 0) AS total_sales_value
     FROM projects p
     LEFT JOIN flats    f ON f.project_id = p.id
     LEFT JOIN bookings b ON b.project_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    params
  );
  return rows;
};

// ─── Summary across all projects (Dashboard card) ─────────────────────────────
const getSummary = async () => {
  const { rows } = await db.query(
    `SELECT
       COUNT(DISTINCT p.id)                                              AS total_projects,
       COUNT(DISTINCT f.id)                                              AS total_flats,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'available')       AS flats_available,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'blocked')         AS flats_blocked,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'sold')            AS flats_sold,
       COALESCE(SUM(b.final_value) FILTER (WHERE b.status != 'cancelled'), 0) AS total_sales_value
     FROM projects p
     LEFT JOIN flats    f ON f.project_id = p.id
     LEFT JOIN bookings b ON b.project_id = p.id`
  );
  return rows[0];
};

// ─── Get Single Project with Configurations ───────────────────────────────────
const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT
       p.*,
       u.name AS created_by_name,
       COALESCE(
         json_agg(
           DISTINCT jsonb_build_object(
             'id',          pc.id,
             'config_name', pc.config_name,
             'total_units', pc.total_units
           )
         ) FILTER (WHERE pc.id IS NOT NULL),
         '[]'
       ) AS configurations,
       COUNT(DISTINCT f.id)                                              AS total_flats_listed,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'available')       AS flats_available,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'blocked')         AS flats_blocked,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'sold')            AS flats_sold
     FROM projects              p
     LEFT JOIN users             u  ON u.id  = p.created_by
     LEFT JOIN project_configurations pc ON pc.project_id = p.id
     LEFT JOIN flats             f  ON f.project_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, u.name`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Project not found'), { status: 404 });
  return rows[0];
};

// ─── Create Project ───────────────────────────────────────────────────────────
const create = async (data) => {
  const {
    name, plot_number, sector_location,
    total_plot_area, area_unit,
    total_floors, total_flats,
    project_status, launch_date,
    expected_completion, description,
    created_by,
  } = data;

  const { rows } = await db.query(
    `INSERT INTO projects
       (name, plot_number, sector_location, total_plot_area, area_unit,
        total_floors, total_flats, project_status, launch_date,
        expected_completion, description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      name, plot_number, sector_location,
      total_plot_area, area_unit || 'sqft',
      total_floors, total_flats,
      project_status || 'upcoming',
      launch_date || null,
      expected_completion || null,
      description || null,
      created_by,
    ]
  );
  return rows[0];
};

// ─── Update Project ───────────────────────────────────────────────────────────
const update = async (id, data) => {
  const allowed = [
    'name', 'plot_number', 'sector_location',
    'total_plot_area', 'area_unit',
    'total_floors', 'total_flats',
    'project_status', 'launch_date',
    'expected_completion', 'description',
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

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await db.query(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  if (!rows[0]) throw Object.assign(new Error('Project not found'), { status: 404 });
  return rows[0];
};

// ─── Delete Project ───────────────────────────────────────────────────────────
const remove = async (id) => {
  const { rowCount } = await db.query('DELETE FROM projects WHERE id = $1', [id]);
  if (!rowCount) throw Object.assign(new Error('Project not found'), { status: 404 });
};

// ─── Configurations ───────────────────────────────────────────────────────────
const getConfigs = async (projectId) => {
  const { rows } = await db.query(
    `SELECT * FROM project_configurations WHERE project_id = $1 ORDER BY config_name`,
    [projectId]
  );
  return rows;
};

const addConfig = async (projectId, { config_name, total_units }) => {
  const { rows } = await db.query(
    `INSERT INTO project_configurations (project_id, config_name, total_units)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [projectId, config_name, total_units || 0]
  );
  if (!rows[0]) throw new Error(`Configuration '${config_name}' already exists for this project`);
  return rows[0];
};

const removeConfig = async (projectId, cid) => {
  const { rowCount } = await db.query(
    'DELETE FROM project_configurations WHERE id = $1 AND project_id = $2',
    [cid, projectId]
  );
  if (!rowCount) throw Object.assign(new Error('Configuration not found'), { status: 404 });
};

module.exports = {
  getAll, getSummary, getById,
  create, update, remove,
  getConfigs, addConfig, removeConfig,
};