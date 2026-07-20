import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
pool.connect().then(() => console.log("Success with ws!")).catch(e => console.error(e));
