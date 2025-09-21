import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { Button, Card } from "@sistema/ui";
import { formatGreeting } from "@sistema/core";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-8 py-16">
      <div className="flex w-full items-center justify-between">
        <div className="rounded-full border border-border bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {formatGreeting("Equipo de Obras")}
        </div>
        <SignedIn>
          <UserButton appearance={{ elements: { avatarBox: "h-10 w-10" } }} />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline">Iniciar sesión</Button>
          </SignInButton>
        </SignedOut>
      </div>

      <div className="flex max-w-3xl flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">Sistema de Ejecución de Obras</h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          Monorepo moderno con Turborepo, pnpm y un stack compartido para experiencias web, API y workers.
          Incluye UI compartida con shadcn/ui, lógica de dominio reutilizable y Prisma listo para tus modelos.
        </p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        <Card title="Web" description="Next.js 14 con App Router, Tailwind y shadcn/ui." />
        <Card title="API" description="NestJS lista para exponer servicios y Prisma." />
        <Card title="Worker" description="BullMQ para jobs críticos y coordinación." />
      </div>

      <SignedIn>
        <Button asChild variant="default" size="lg" className="gap-2">
          <Link href="/dashboard">
            Ir al dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="default" size="lg" className="gap-2">
            Crear cuenta o iniciar sesión
            <ArrowRight className="h-4 w-4" />
          </Button>
        </SignInButton>
      </SignedOut>
    </main>
  );
}
