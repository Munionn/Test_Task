import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { db } from './db/connection';
import { users } from './db/schemas';
import { eq } from 'drizzle-orm';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

