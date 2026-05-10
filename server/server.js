const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const errorHandler = require('./middleware/errorHandler');

// Główny punkt wejścia backendu Express.
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globalne dla całej aplikacji.
app.use(cors()); // Pozwala na zapytania z innych adresów (np. z telefonu)
app.use(express.json({ limit: '15mb' })); // Pozwala serwerowi rozumiec JSON i przyjac avatar w base64

// Prosta trasa testowa
app.get('/', (req, res) => {
    res.send('Serwer Express działa.');
});

// Trasy modułu autoryzacji.
const tripRoutes = require('./routes/trip.routes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/trip', tripRoutes);
// Centralna obsługa błędów powinna być podpięta na końcu.
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});

