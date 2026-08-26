"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (next !== "/") {
        redirectTo.searchParams.set("next", next);
      }

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo.toString(),
        },
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setMessage("Verifique seu email para concluir o login.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel iniciar o login.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar magic link"}
      </Button>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
