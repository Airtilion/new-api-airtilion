import express, { json, static as expStatic } from 'express';
import { config } from 'dotenv';
import path, { join } from 'path';

import clientRouter from './routes/client.js';
import projectRouter from './routes/project.js';
import { fileURLToPath } from 'url';

import cors from 'cors';

const app = express();

// Konfiguracja CORS
const corsOptions = {
  origin: 'http://localhost:3000', // Adres frontend-u
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Jeśli używasz ciasteczek
};

app.use(cors(corsOptions));

config();

app.use(json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use('/uploads', expStatic(join(__dirname, 'uploads')));



app.use('/api/client', clientRouter);
app.use('/api/project', projectRouter);

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));