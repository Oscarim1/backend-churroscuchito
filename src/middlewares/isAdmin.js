import pool from '../config/db.js';

export const isAdmin = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT role FROM profiles WHERE id = $1',
      [userId]
    );

    const profile = result.rows[0];

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: solo administradores' });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar rol de usuario' });
  }
};
