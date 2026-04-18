const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Pozwala na zapytania z innych adresów (np. z telefonu)
app.use(express.json()); // Pozwala serwerowi rozumieć format JSON w body zapytania

// Prosta trasa testowa
app.get('/', (req, res) => {
    res.send('Serwer Express działa.');
});

// Tutaj będziesz importować swoje trasy (np. auth i profile)
// const authRoutes = require('./routes/auth');
// app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});