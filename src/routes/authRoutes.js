// routes/authRoutes.js
import { Router } from 'express';
import { register, login } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
  
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }
  
    try {
      const result = await pool.query(
        `SELECT * FROM refresh_tokens WHERE token = $1`,
        [refreshToken]
      );
  
      const tokenData = result.rows[0];
      if (!tokenData) return res.status(403).json({ error: 'Token inválido' });
  
      if (new Date(tokenData.expires_at) < new Date()) {
        return res.status(403).json({ error: 'Refresh token expirado' });
      }
  
      // Generar nuevo access token
      const accessToken = jwt.sign(
        { id: tokenData.user_id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
  
      res.json({ accessToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al renovar token' });
    }
  });
  
  router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;
  
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }
  
    try {
      const result = await pool.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Refresh token no encontrado' });
      }
  
      res.json({ message: 'Sesión cerrada correctamente' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al cerrar sesión' });
    }
  });

export default router;
