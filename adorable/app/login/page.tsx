import Link from "next/link";
import { LoginForm } from "./login-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getSafeAuthRedirectPath } from "@/lib/product-auth";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedNext = Array.isArray(params?.next)
    ? params?.next[0]
    : params?.next;
  const next = getSafeAuthRedirectPath(requestedNext);
  const user = await getCurrentUser().catch(() => null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-normal">Login</h1>
          <p className="text-sm text-muted-foreground">
            Entre com seu email para acessar sua sessao.
          </p>
        </div>

        {user ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Voce esta logado como{" "}
              <span className="font-medium text-foreground">
                {user.email ?? user.id}
              </span>
              .
            </p>
            <div className="flex gap-2">
              <Button asChild variant="secondary" className="flex-1">
                <Link href={next}>Continuar</Link>
              </Button>
              <form
                action={`/auth/logout?next=${encodeURIComponent("/")}`}
                method="post"
              >
                <Button type="submit" variant="outline">
                  Sair
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <LoginForm next={next} />
        )}
      </div>
    </main>
  );
}
