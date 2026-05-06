const db   = require('../../config/db');
const path = require('path');
const fs   = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');

// ══════════════════════════════════════════════════════════════
// SAVE — called after multer processes the file
// ══════════════════════════════════════════════════════════════

const save = async (file, body, userId) => {
  const {
    doc_type, doc_label,
    project_id, booking_id,
    flat_id, customer_id, expense_id,
  } = body;

  // At least one entity link is required
  if (!project_id && !booking_id && !flat_id && !customer_id && !expense_id) {
    // Clean up uploaded file before throwing
    fs.unlink(file.path, () => {});
    throw Object.assign(
      new Error('Document must be linked to at least one entity: project, booking, flat, customer, or expense'),
      { status: 400 }
    );
  }

  const valid_types = ['agreement','kyc','payment_receipt','approval','plan','noc','legal','marketing','other'];
  if (!valid_types.includes(doc_type)) {
    fs.unlink(file.path, () => {});
    throw Object.assign(new Error(`Invalid doc_type. Must be one of: ${valid_types.join(', ')}`), { status: 422 });
  }

  // Build relative file_path for storage (portable across environments)
  const subFolder   = doc_type;
  const relative    = `uploads/${subFolder}/${file.filename}`;

  const { rows } = await db.query(
    `INSERT INTO documents
       (project_id, booking_id, flat_id, customer_id, expense_id,
        doc_type, doc_label, file_name, stored_name,
        file_path, file_size, mime_type, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      project_id  || null,
      booking_id  || null,
      flat_id     || null,
      customer_id || null,
      expense_id  || null,
      doc_type,
      doc_label   || null,
      file.originalname,
      file.filename,
      relative,
      file.size,
      file.mimetype,
      userId,
    ]
  );
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// GET ALL (with optional filters)
// ══════════════════════════════════════════════════════════════

const getAll = async ({ doc_type, project_id, booking_id, customer_id } = {}) => {
  const conditions = [`d.is_active = TRUE`];
  const params     = [];
  let   i = 1;

  if (doc_type)    { conditions.push(`d.doc_type    = $${i++}`); params.push(doc_type); }
  if (project_id)  { conditions.push(`d.project_id  = $${i++}`); params.push(project_id); }
  if (booking_id)  { conditions.push(`d.booking_id  = $${i++}`); params.push(booking_id); }
  if (customer_id) { conditions.push(`d.customer_id = $${i++}`); params.push(customer_id); }

  const { rows } = await db.query(
    `SELECT
       d.*,
       u.name          AS uploaded_by_name,
       p.name          AS project_name,
       f.flat_number,
       c.name          AS customer_name,
       b.id            AS booking_ref
     FROM documents d
     LEFT JOIN users     u ON u.id = d.uploaded_by
     LEFT JOIN projects  p ON p.id = d.project_id
     LEFT JOIN flats     f ON f.id = d.flat_id
     LEFT JOIN customers c ON c.id = d.customer_id
     LEFT JOIN bookings  b ON b.id = d.booking_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.uploaded_at DESC`,
    params
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// GET BY ENTITY (generic — used for all entity-specific routes)
// ══════════════════════════════════════════════════════════════

const getByEntity = async (column, entityId) => {
  const allowed = ['project_id','booking_id','flat_id','customer_id','expense_id'];
  if (!allowed.includes(column))
    throw Object.assign(new Error('Invalid entity column'), { status: 400 });

  const { rows } = await db.query(
    `SELECT
       d.*,
       u.name AS uploaded_by_name
     FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.${column} = $1 AND d.is_active = TRUE
     ORDER BY d.doc_type ASC, d.uploaded_at DESC`,
    [entityId]
  );
  return rows;
};

// ══════════════════════════════════════════════════════════════
// GET SINGLE
// ══════════════════════════════════════════════════════════════

const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT
       d.*,
       u.name          AS uploaded_by_name,
       p.name          AS project_name,
       f.flat_number,
       c.name          AS customer_name
     FROM documents d
     LEFT JOIN users     u ON u.id = d.uploaded_by
     LEFT JOIN projects  p ON p.id = d.project_id
     LEFT JOIN flats     f ON f.id = d.flat_id
     LEFT JOIN customers c ON c.id = d.customer_id
     WHERE d.id = $1 AND d.is_active = TRUE`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Document not found'), { status: 404 });
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// UPDATE LABEL
// ══════════════════════════════════════════════════════════════

const updateLabel = async (id, doc_label) => {
  const { rows } = await db.query(
    `UPDATE documents SET doc_label = $1 WHERE id = $2 AND is_active = TRUE RETURNING *`,
    [doc_label, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Document not found'), { status: 404 });
  return rows[0];
};

// ══════════════════════════════════════════════════════════════
// DELETE — soft delete in DB + physical file removal
// ══════════════════════════════════════════════════════════════

const remove = async (id) => {
  // Fetch first to get file path
  const { rows } = await db.query(
    `SELECT * FROM documents WHERE id = $1 AND is_active = TRUE`, [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Document not found'), { status: 404 });

  const doc = rows[0];

  // 1. Soft delete in DB
  await db.query(
    `UPDATE documents SET is_active = FALSE WHERE id = $1`, [id]
  );

  // 2. Remove physical file from disk (non-blocking — log but do not fail)
  const absPath = path.join(__dirname, '..', '..', '..', doc.file_path);
  fs.unlink(absPath, (err) => {
    if (err) console.warn(`[documents] Could not delete file: ${absPath} — ${err.message}`);
  });
};

module.exports = {
  save,
  getAll, getByEntity, getById,
  updateLabel, remove,
};