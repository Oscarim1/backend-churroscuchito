import express from 'express';
import authRoutes from './authRoutes.js';
import orderRoutes from './orderRoutes.js';
import userRoutes from './userRoutes.js';
import cashCloseRoutes from './cashCloseRoutes.js';
import productRoutes from './productRoutes.js';
import pdfRoutes from './pdfRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/cash-closes', cashCloseRoutes);
router.use('/pdfs', pdfRoutes);

export default router;