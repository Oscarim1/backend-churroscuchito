import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import pool from '../config/db.js';

const router = Router();

//Crear orden
router.post('/', authMiddleware, async (req, res) => {
  const {
    total,
    metodo_pago,
    status,
    points_used,
    points_earned,
    items
  } = req.body;

  const userId = req.user.id;

  if (!total || !metodo_pago || !status || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Campos obligatorios: total, metodo_pago, status, items[]' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insertar orden
    const orderResult = await client.query(
      `INSERT INTO orders
        (user_id, total, metodo_pago, status, points_used, points_earned)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, total, metodo_pago, status, points_used ?? 0, points_earned ?? 0]
    );

    const order = orderResult.rows[0];

    // 2. Insertar los order_items
    for (const item of items) {
      const { product_id, quantity, price } = item;

      if (!product_id || !quantity || !price) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cada item debe tener product_id, quantity y price' });
      }

      await client.query(
        `INSERT INTO order_items
          (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, product_id, quantity, price]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ message: 'Orden creada con items', order });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear la orden con items' });
  } finally {
    client.release();
  }
});


router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 1. Obtener la orden
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada o no pertenece al usuario' });
    }

    // 2. Obtener los items
    const itemsResult = await pool.query(
      `SELECT
         oi.product_id,
         oi.quantity,
         oi.price,
         p.name,
         p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      order,
      items: itemsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la orden' });
  }
});


export default router;