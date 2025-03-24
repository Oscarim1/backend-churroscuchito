const express = require('express');
const { register, login } = require('./authController');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/register', register);
app.post('/login', login);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
