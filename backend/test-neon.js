import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
const connectionString = process.env.DATABASE_URL;
console.log("String:", connectionString);
const pool = new Pool({ connectionString });
pool.connect().then(() => console.log("Success")).catch(e => console.error(e));
