import { redirect } from "next/navigation";
import { getSessionUser, withSessionClaims } from "@/lib/auth";
import AdminClient from "@/components/AdminClient";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole !== "admin") redirect("/dashboard");

  const data = await withSessionClaims(async (client) => {
    const users = await client.query(
      `select id, email, full_name, global_role, created_at
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
    return {
      users: users.rows,
      projects: projects.rows,
      taskTypes: taskTypes.rows,
      activities: activities.rows,
      members: members.rows,
    };
  });

  return <AdminClient {...data} />;
}
