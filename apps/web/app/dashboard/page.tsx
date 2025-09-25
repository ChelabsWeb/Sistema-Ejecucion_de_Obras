import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button, Card } from "@sistema/ui";
import { formatGreeting } from "@sistema/core";

export default async function DashboardPage() {
  const { userId, orgId, orgRole } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{formatGreeting(user?.firstName ?? "Equipo")}</h1>
        <p className="text-sm text-muted-foreground">
          Organizacion activa: {orgId ?? "Ninguna"} - Rol: {orgRole ?? "sin rol"}
        </p>
      </header>

      <Card
        title="Proyectos"
        description="Proximamente veras un listado de proyectos filtrados por organizacion."
      />

      <div className="flex justify-start">
        <Button asChild variant="default">
          <Link href="/dashboard/gantt">Abrir plan Gantt</Link>
        </Button>
      </div>
    </section>
  );
}
