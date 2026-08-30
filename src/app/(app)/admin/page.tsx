import { redirect } from "next/navigation";
import { getSessionUser, withSessionClaims } from "@/lib/auth";
import AdminClient from "@/components/AdminClient";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole !== "admin") redirect("/dashboard");

  const data = await withSessionClaims(async (client) => {
    const users = await client.query(
      `select id, email, full_name, global_role, avatar_url, created_at
         from public.profiles order by full_name`,
    );
    const projects = await client.query(`select * from public.projects order by name desc`);
    const taskTypes = await client.query(
      `select * from public.task_types order by sort_order, label`,
    );
    const activities = await client.query(
      `select * from public.activities order by sort_order, label`,
    );
    const members = await client.query(
      `select project_id, user_id, project_role from public.project_members`,
    );
    // Only ever readable by an Admin (see the login_sessions RLS policy) —
    // capped at the 500 most recent so this page stays fast as the log grows.
    const sessions = await client.query(
      `select ls.id, ls.user_id, ls.logged_in_at, ls.logged_out_at, ls.expires_at,
              ls.ip_address, ls.user_agent, pr.full_name, pr.email, pr.avatar_url
         from public.login_sessions ls
         join public.profiles pr on pr.id = ls.user_id
        order by ls.logged_in_at desc
        limit 500`,
    );
    return {
      users: users.rows,
      projects: projects.rows,
      taskTypes: taskTypes.rows,
      activities: activities.rows,
      members: members.rows,
      sessions: sessions.rows,
    };
  });

  return <AdminClient {...data} />;
}
