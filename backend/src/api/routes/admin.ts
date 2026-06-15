import type { FastifyInstance } from "fastify";
import yaml from "js-yaml";
import { query } from "../../db/connection.js";

interface LabFile {
  filename: string;
  content: string;
}

interface SyncBody {
  labs: LabFile[];
}

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: SyncBody }>("/admin/labs/sync", async (request, reply) => {
    const secret = request.headers["x-lab-sync-secret"];
    if (!secret || secret !== process.env.LAB_SYNC_SECRET) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const { labs } = request.body ?? {};
    if (!Array.isArray(labs) || labs.length === 0) {
      return reply.status(400).send({ error: "No labs provided" });
    }

    let synced = 0;
    const failed: string[] = [];

    for (const lab of labs) {
      try {
        const def = yaml.load(lab.content) as Record<string, any>;

        if (!def?.id || !def?.title) {
          fastify.log.warn({ filename: lab.filename }, "Skipping lab: missing id or title");
          failed.push(lab.filename);
          continue;
        }

        await query(
          `INSERT INTO lab_definitions (
            slug, title, description, difficulty, terraform_module,
            scenario_id, content, outputs_mapping,
            estimated_minutes, timeout_minutes, published, sort_order
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (slug) DO UPDATE SET
            title             = EXCLUDED.title,
            description       = EXCLUDED.description,
            difficulty        = EXCLUDED.difficulty,
            terraform_module  = EXCLUDED.terraform_module,
            scenario_id       = EXCLUDED.scenario_id,
            content           = EXCLUDED.content,
            estimated_minutes = EXCLUDED.estimated_minutes,
            timeout_minutes   = EXCLUDED.timeout_minutes,
            published         = true,
            sort_order        = EXCLUDED.sort_order,
            updated_at        = now()`,
          [
            def.id,
            def.title,
            def.description ?? null,
            def.difficulty ?? "beginner",
            def.terraform_module ?? null,
            def.scenario_id ?? null,
            JSON.stringify(def),
            JSON.stringify({}),
            def.estimated_minutes ?? 60,
            def.timeout_minutes ?? 120,
            true,
            def.sort_order ?? 999,
          ]
        );
        synced++;
      } catch (err) {
        fastify.log.error({ err, filename: lab.filename }, "Failed to sync lab");
        failed.push(lab.filename);
      }
    }

    fastify.log.info({ synced, failed: failed.length }, "Lab sync complete");
    return reply.send({ synced, failed });
  });
}
