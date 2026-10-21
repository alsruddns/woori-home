import dotenv from "dotenv";

// Next.js secrets live in .env.local. Explicit shell/GitHub values always take precedence.
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });
