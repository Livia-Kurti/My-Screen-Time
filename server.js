require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import the api.js file (where the Prisma logic lives)
const apiRoutes = require('./api'); 

const app = express();
// Force Port 5000 to match your frontend
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// This connects the /api/anime URL to your api.js file
app.use('/api/anime', apiRoutes);

app.get('/', (req, res) => {
    res.send('Server is running on Port 5000!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});