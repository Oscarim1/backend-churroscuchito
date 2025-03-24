import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import { generarPdfOrden } from '../utils/generarPdfOrden.js';
import pool from '../config/db.js';
import fs from 'fs';

const router = Router();

// Ruta de ejemplo: obtener todos los usuarios registrados
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, username FROM users');
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Ruta de ejemplo: ver perfiles con rol
router.get('/profiles', authMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, rut, role, puntos FROM profiles ORDER BY created_at DESC'
    );
    res.json({ profiles: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfiles' });
  }
});

router.post('/products', authMiddleware, isAdmin, async (req, res) => {
    const {
      name,
      price,
      points,
      image_url,
      description,
      precio_puntos,
      category,
      sub_category
    } = req.body;
  
    if (!name || !price) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }
  
    try {
      const result = await pool.query(
        `INSERT INTO products
        (name, price, points, image_url, description, precio_puntos, category, sub_category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [name, price, points ?? 0, image_url, description, precio_puntos, category, sub_category]
      );
  
      res.status(201).json({ message: 'Producto creado', product: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al crear el producto' });
    }
  });

  router.put('/products/:id', authMiddleware, isAdmin, async (req, res) => {
    const { id } = req.params;
    const {
      name,
      price,
      points,
      image_url,
      description,
      precio_puntos,
      category,
      sub_category
    } = req.body;
  
    try {
      const result = await pool.query(
        `UPDATE products SET
          name = $1,
          price = $2,
          points = $3,
          image_url = $4,
          description = $5,
          precio_puntos = $6,
          category = $7,
          sub_category = $8
        WHERE id = $9
        RETURNING *`,
        [name, price, points, image_url, description, precio_puntos, category, sub_category, id]
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
  
      res.json({ message: 'Producto actualizado', product: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar el producto' });
    }
  });

  router.delete('/products/:id', authMiddleware, isAdmin, async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
  
      res.json({ message: 'Producto eliminado' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al eliminar el producto' });
    }
  });
  
  // Ruta de ejemplo: ver las ordenes
  router.get('/orders', authMiddleware, isAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          o.*,
          p.username,
          p.rut,
          p.role
        FROM orders o
        LEFT JOIN profiles p ON o.user_id = p.id
        ORDER BY o.created_at DESC
        `
      );
  
      res.json({ orders: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener todas las órdenes' });
    }
  });

  router.put('/orders/:id', authMiddleware, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { metodo_pago } = req.body;
  
    if (!metodo_pago) {
      return res.status(400).json({ error: 'metodo_pago es obligatorio' });
    }
  
    try {
      const result = await pool.query(
        `
        UPDATE orders
        SET metodo_pago = $1
        WHERE id = $2
        RETURNING *
        `,
        [metodo_pago, id]
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
  
      res.json({ message: 'Método de pago actualizado', order: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar el método de pago' });
    }
  });

  router.get('/orders/:id', authMiddleware, isAdmin, async (req, res) => {
    const { id } = req.params;
  
    try {
      // 1. Obtener la orden + datos del usuario (si existe)
      const orderResult = await pool.query(
        `
        SELECT
          oi.product_id,
          oi.quantity,
          oi.price,
          p.name,
          p.image_url,
          p.category
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        `,
        [id]
      );
  
      const order = orderResult.rows[0];
  
      if (!order) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
  
      // 2. Obtener los productos de la orden
      const itemsResult = await pool.query(
        `
        SELECT
          oi.product_id,
          oi.quantity,
          oi.price,
          p.name,
          p.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        `,
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

  router.get('/orders/:id/imprimir', authMiddleware, isAdmin, async (req, res) => {
    const { id } = req.params;
  
    try {
      const orderResult = await pool.query(
        `SELECT o.*, p.username FROM orders o LEFT JOIN profiles p ON o.user_id = p.id WHERE o.id = $1`,
        [id]
      );
  
      const order = orderResult.rows[0];
      if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  
      const itemsResult = await pool.query(
        `SELECT
           oi.quantity,
           oi.price,
           p.name,
           p.category
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [id]
      );
  
      const items = itemsResult.rows;
      const churros = items.filter(i => i.category === 'Churros');
      const otros = items.filter(i => i.category !== 'Churros');
  
      const files = [];
  
      if (churros.length > 0) {
        const churrosPdf = await generarPdfOrden(order, churros, 'Churros');
        files.push(churrosPdf);
      }
  
      if (otros.length > 0) {
        const otrosPdf = await generarPdfOrden(order, otros, 'Otros');
        files.push(otrosPdf);
      }
  
      if (files.length === 0) {
        return res.status(204).send(); // No hay nada para imprimir
      }
  
      // Si solo hay 1 PDF, lo servimos directamente
      if (files.length === 1) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=${files[0].split('/').pop()}`);
        return res.sendFile(files[0], { root: '.' }, () => {
          fs.unlink(files[0], () => {});
        });
      }
  
      // Si hay 2 PDFs: enviar uno tras otro manualmente no es posible por HTTP
  
      const buffers = await Promise.all(
        files.map(file => fs.readFile(file))
      );
  
      // Limpieza de archivos temporales
      files.forEach(file => fs.unlink(file, () => {}));
  
      // Devuelve ambos como base64 separados
      res.json({
        churros: churros.length > 0 ? buffers[0].toString('base64') : null,
        otros: otros.length > 1 ? buffers[1].toString('base64') : null
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al generar PDFs' });
    }
  });
  

  router.post('/cierres-caja', authMiddleware, isAdmin, async (req, res) => {
    const {
      total_efectivo,
      total_maquinas,
      maquina1,
      maquina2,
      maquina3,
      salidas_efectivo,
      ingresos_efectivo,
      observacion,
      total_pagos_tarjeta_web
    } = req.body;
  
    const usuario_id = req.user.id;
  
    // Validación básica
    if (
      total_efectivo == null || total_maquinas == null ||
      maquina1 == null || salidas_efectivo == null || ingresos_efectivo == null
    ) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }
  
    try {
      const result = await pool.query(
        `INSERT INTO cierres_caja (
          total_efectivo, total_maquinas, maquina1, maquina2, maquina3,
          salidas_efectivo, ingresos_efectivo, observacion,
          total_pagos_tarjeta_web, usuario_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          total_efectivo,
          total_maquinas,
          maquina1,
          maquina2,
          maquina3,
          salidas_efectivo,
          ingresos_efectivo,
          observacion,
          total_pagos_tarjeta_web,
          usuario_id
        ]
      );
  
      res.status(201).json({ message: 'Cierre de caja registrado', cierre: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar el cierre de caja' });
    }
  });

  router.get('/cierres-caja', authMiddleware, isAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          c.*,
          p.username
        FROM cierres_caja c
        LEFT JOIN profiles p ON c.usuario_id = p.id
        ORDER BY c.fecha DESC
        `
      );
  
      res.json({ cierres: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener los cierres de caja' });
    }
  });

  router.get('/cierres-caja/:id', authMiddleware, isAdmin, async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await pool.query(
        `
        SELECT
          c.*,
          p.username
        FROM cierres_caja c
        LEFT JOIN profiles p ON c.usuario_id = p.id
        WHERE c.id = $1
        `,
        [id]
      );
  
      const cierre = result.rows[0];
  
      if (!cierre) {
        return res.status(404).json({ error: 'Cierre de caja no encontrado' });
      }
  
      res.json({ cierre });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener el cierre de caja' });
    }
  });

  router.post('/cierres-caja/auto/:fecha', authMiddleware, isAdmin, async (req, res) => {
    const { fecha } = req.params; // Formato esperado: YYYY-MM-DD
    const usuario_id = req.user.id;
  
    const {
      maquina1,
      maquina2,
      maquina3,
      salidas_efectivo,
      ingresos_efectivo,
      observacion
    } = req.body;
  
    if (!fecha || maquina1 == null || salidas_efectivo == null || ingresos_efectivo == null) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
  
    try {
      // 1. Verificar si ya hay un cierre en esa fecha
      const existing = await pool.query(`
        SELECT id FROM cierres_caja
        WHERE fecha::date = $1
      `, [fecha]);
  
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'Ya existe un cierre de caja para esa fecha' });
      }
  
      // 2. Obtener pedidos del día
      const pagosResult = await pool.query(`
        SELECT metodo_pago, SUM(total) AS total
        FROM orders
        WHERE created_at::date = $1
        GROUP BY metodo_pago
      `, [fecha]);
  
      if (pagosResult.rowCount === 0) {
        return res.status(404).json({ error: 'No hay pedidos en esa fecha' });
      }
  
      let total_efectivo = 0;
      let total_pagos_tarjeta_web = 0;
  
      pagosResult.rows.forEach(p => {
        if (p.metodo_pago === 'efectivo') {
          total_efectivo = Number(p.total);
        } else {
          total_pagos_tarjeta_web += Number(p.total);
        }
      });
  
      const total_maquinas =
        Number(maquina1 ?? 0) + Number(maquina2 ?? 0) + Number(maquina3 ?? 0);
  
      // 3. Crear cierre de caja para esa fecha
      const result = await pool.query(
        `INSERT INTO cierres_caja (
          fecha, total_efectivo, total_maquinas, maquina1, maquina2, maquina3,
          salidas_efectivo, ingresos_efectivo, observacion,
          total_pagos_tarjeta_web, usuario_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          fecha,
          total_efectivo,
          total_maquinas,
          maquina1,
          maquina2,
          maquina3,
          salidas_efectivo,
          ingresos_efectivo,
          observacion,
          total_pagos_tarjeta_web,
          usuario_id
        ]
      );
  
      res.status(201).json({ message: 'Cierre de caja creado para fecha específica', cierre: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al generar el cierre de caja' });
    }
  });
  
  
  router.get('/cierres-caja/hoy', authMiddleware, isAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          c.*,
          p.username
        FROM cierres_caja c
        LEFT JOIN profiles p ON c.usuario_id = p.id
        WHERE c.fecha::date = CURRENT_DATE
        `
      );
  
      if (result.rowCount === 0) {
        return res.json({ exists: false, cierre: null });
      }
  
      res.json({
        exists: true,
        cierre: result.rows[0]
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al consultar cierre de caja del día' });
    }
  });
  
  router.get('/cierres-caja/pendientes', authMiddleware, isAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT o.created_at::date AS fecha
        FROM orders o
        WHERE o.created_at::date NOT IN (
          SELECT fecha::date FROM cierres_caja
        )
        ORDER BY fecha DESC
      `);
  
      res.json({ pendientes: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener cierres pendientes' });
    }
  });
  
export default router;
