import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { query } from "../../db/connection.js";

export async function trackRoutes(fastify: FastifyInstance) {
  /**
   * GET /tracks
   * Lab catalog grouped by terraform module with environment + per-lab progress.
   * Auth is optional: authenticated users get personal progress and environment
   * state; anonymous users see all published labs with progress = "available".
   */
  fastify.get(
    "/tracks",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Optional auth — proceed as anonymous if token is absent or invalid
        let userId: string | null = null;
        try {
          await request.jwtVerify();
          userId = request.user.sub;
        } catch {
          // anonymous request — continue without user context
        }

        const labsResult = await query(
          `SELECT id, slug, title, description, difficulty, terraform_module,
                  scenario_id, estimated_minutes, published, sort_order,
                  COALESCE(content->'objectives', '[]'::jsonb) as objectives
           FROM lab_definitions
           WHERE published = true
           ORDER BY sort_order ASC, title ASC`,
          []
        );

        const envResult = userId
          ? await query(
              `SELECT id, terraform_module, status, current_scenario, expires_at, created_at
               FROM lab_environments
               WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()`,
              [userId]
            )
          : { rows: [] };

        const sessionResult = userId
          ? await query(
              `SELECT ld.slug, ls.status, ls.completed_at, ls.environment_id
               FROM lab_sessions ls
               JOIN lab_definitions ld ON ld.id = ls.lab_id
               WHERE ls.user_id = $1
               ORDER BY ls.created_at DESC`,
              [userId]
            )
          : { rows: [] };

        const envByModule = new Map<string, (typeof envResult.rows)[0]>();
        for (const env of envResult.rows) {
          if (!envByModule.has(env.terraform_module)) {
            envByModule.set(env.terraform_module, env);
          }
        }

        const labStatus = new Map<string, string>();
        for (const row of sessionResult.rows) {
          if (labStatus.has(row.slug)) continue;
          if (row.status === "completed" || row.status === "stopped") {
            labStatus.set(row.slug, "completed");
          } else if (
            row.status === "active" ||
            row.status === "scenario_switching" ||
            row.status === "provisioning"
          ) {
            labStatus.set(row.slug, "active");
          }
        }

        const moduleMap = new Map<
          string,
          {
            terraform_module: string;
            environment: (typeof envResult.rows)[0] | null;
            labs: Array<{
              id: string;
              slug: string;
              title: string;
              description: string | null;
              difficulty: string;
              scenario_id: string | null;
              estimated_minutes: number;
              sort_order: number;
              objectives: string[];
              progress: "completed" | "active" | "available";
            }>;
          }
        >();

        for (const lab of labsResult.rows) {
          if (!moduleMap.has(lab.terraform_module)) {
            moduleMap.set(lab.terraform_module, {
              terraform_module: lab.terraform_module,
              environment: envByModule.get(lab.terraform_module) ?? null,
              labs: [],
            });
          }
          const progress = (labStatus.get(lab.slug) ?? "available") as
            | "completed"
            | "active"
            | "available";

          moduleMap.get(lab.terraform_module)!.labs.push({
            id: lab.id,
            slug: lab.slug,
            title: lab.title,
            description: lab.description,
            difficulty: lab.difficulty,
            scenario_id: lab.scenario_id,
            estimated_minutes: lab.estimated_minutes,
            sort_order: lab.sort_order,
            objectives: Array.isArray(lab.objectives) ? lab.objectives : [],
            progress,
          });
        }

        return reply.send({
          tracks: Array.from(moduleMap.values()),
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: "Failed to load lab catalog" });
      }
    }
  );
}
