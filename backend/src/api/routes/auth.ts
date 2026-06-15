import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createUser, getUserByEmail, getUserWithPassword, verifyPassword } from "../../auth/user.js";
import type { JWTPayload } from "../../types/index.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post<{ Body: unknown }>("/auth/register", async (request, reply) => {
    try {
      const { email, password, name } = RegisterSchema.parse(request.body);

      // Check if user exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return reply.status(409).send({ error: "User already exists" });
      }

      // Create user
      const user = await createUser(email, password, name);

      // Generate JWT token
      const token = fastify.jwt.sign(
        { sub: user.id, email: user.email } as JWTPayload,
        { expiresIn: "24h" }
      );

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Login
  fastify.post<{ Body: unknown }>("/auth/login", async (request, reply) => {
    try {
      const { email, password } = LoginSchema.parse(request.body);

      const user = await getUserWithPassword(email);
      if (!user) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const passwordValid = await verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      // Generate JWT token
      const token = fastify.jwt.sign(
        { sub: user.id, email: user.email } as JWTPayload,
        { expiresIn: "24h" }
      );

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.issues });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Refresh token
  fastify.post<{ Body: Record<string, never> }>("/auth/refresh", async (request, reply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as JWTPayload;

      const user = await getUserByEmail(payload.email);
      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      const newToken = fastify.jwt.sign(
        { sub: user.id, email: user.email } as JWTPayload,
        { expiresIn: "24h" }
      );

      return reply.send({ token: newToken });
    } catch (error) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  // Get current user
  fastify.get("/auth/me", async (request, reply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as JWTPayload;

      const user = await getUserByEmail(payload.email);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.send(user);
    } catch (error) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
}
