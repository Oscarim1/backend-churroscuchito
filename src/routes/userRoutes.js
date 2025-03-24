import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import pool from '../config/db.js';

const router = Router();


router.get('/me', authMiddleware, (req, res) => {
  res.json({
    message: 'Usuario autenticado',
    user: req.user,
  });
});

router.get('/profile', authMiddleware, async (req, res) => {
    const userId = req.user.id;
  
    try {
      const result = await pool.query(
        'SELECT username, rut, puntos, role, avatar_url, created_at FROM profiles WHERE id = $1',
        [userId]
      );
  
      const profile = result.rows[0];
  
      if (!profile) {
        return res.status(404).json({ error: 'Perfil no encontrado' });
      }
  
      res.json({ profile });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener el perfil' });
    }
  });


export default router; 