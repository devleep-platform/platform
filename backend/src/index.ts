import "dotenv/config";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import { initializeDatabase } from "./db/schema.js";
import { authRoutes } from "./api/routes/auth.js";
import { awsRoutes } from "./api/routes/aws.js";
import { labRoutes } from "./api/routes/labs.js";
import { provisioningRoutes } from "./api/routes/provisioning.js";
import { environmentRoutes } from "./api/routes/environments.js";
import { trackRoutes } from "./api/routes/tracks.js";
import { adminRoutes } from "./api/routes/admin.js";
import type { JWTPayload } from "./types/index.js";
import { runMigrations } from './db/migrate.js'; // FIX 3: Added .js extension

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Register plugins
await fastify.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "https://devleep.com"];

await fastify.register(fastifyCors, {
  origin: corsOrigins,
  credentials: true,
});

await fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
});

// Auth decorator
fastify.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      error: "Unauthorized: Invalid or missing authentication token",
    });
  }
});

// Health check
fastify.get("/health", async (request, reply) => {
  return reply.send({ status: "ok" });
});

// Initialize database
try {
  await initializeDatabase();
  console.log("✓ Database initialized");
} catch (error) {
  console.error("✗ Database initialization failed:", error);
  process.exit(1);
}

// Register routes
await authRoutes(fastify);
await awsRoutes(fastify);
await labRoutes(fastify);
await provisioningRoutes(fastify);
await environmentRoutes(fastify);
await trackRoutes(fastify);
await adminRoutes(fastify);

// Start server
const start = async () => {
  try {
    // FIX 1: Run migrations securely within the VPC before accepting traffic
    console.log("Running database migrations...");
    await runMigrations();

    // FIX 2: Changed fallback port to 8080 to match AWS ALB target group
    const port = parseInt(process.env.PORT || "8080", 10);
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`✓ Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// FIX 4: Actually invoke the start function
start();