import type { FastifyInstance } from "fastify";
import { query } from "../../db/connection.js";
import type { LabDefinition } from "../../types/index.js";

export async function labRoutes(fastify: FastifyInstance) {
  // List all published labs
  fastify.get<{ Querystring: { published?: string } }>("/labs", async (request, reply) => {
    try {
      const publishedOnly = request.query.published === "true";

      let queryStr = "SELECT * FROM lab_definitions";
      const params: any[] = [];

      if (publishedOnly) {
        queryStr += " WHERE published = true";
      }

      queryStr += " ORDER BY sort_order ASC, title ASC";

      const result = await query(queryStr, params);

      return reply.send({
        labs: result.rows as LabDefinition[],
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Get lab by slug
  fastify.get<{ Params: { slug: string } }>("/labs/:slug", async (request, reply) => {
    try {
      const { slug } = request.params;

      const result = await query(
        "SELECT * FROM lab_definitions WHERE slug = $1",
        [slug]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: "Lab not found" });
      }

      return reply.send({
        lab: result.rows[0] as LabDefinition,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // Create lab (admin only - placeholder)
  fastify.post<{ Body: unknown }>("/labs", async (request, reply) => {
    try {
      await request.jwtVerify();

      // TODO: Add admin role check
      const labData = request.body as any;

      const result = await query(
        `INSERT INTO lab_definitions 
         (slug, title, description, difficulty, terraform_module, content, outputs_mapping, estimated_minutes, timeout_minutes, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          labData.slug,
          labData.title,
          labData.description,
          labData.difficulty,
          labData.terraform_module,
          JSON.stringify(labData.content || { objectives: [], steps: [] }),
          JSON.stringify(labData.outputs_mapping || {}),
          labData.estimated_minutes || 60,
          labData.timeout_minutes || 120,
          labData.published || false,
        ]
      );

      return reply.status(201).send({
        lab: result.rows[0] as LabDefinition,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
