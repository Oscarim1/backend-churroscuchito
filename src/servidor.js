import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config();

const app = express();
app.use(express.json());

// Rutas públicas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Rutas protegidas
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', adminRoutes);
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
