"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid username or password");
    } else {
      window.location.href = "/balance-sheet";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Card className="w-full max-w-sm border-0 shadow-2xl">
        <div className="rounded-t-xl bg-gradient-to-br from-[#1a2876] to-[#000244] px-6 py-8">
          <div className="text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-300">
              Serrano
            </span>
            <span className="block text-2xl font-extrabold tracking-tight text-white">
              Budget<span className="text-amber-400">-inator</span>
            </span>
            <p className="mt-2 text-xs text-sky-200/70">
              Sign in to manage your budget
            </p>
          </div>
        </div>
        <CardContent className="rounded-b-xl pt-6 pb-8 px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-[#000366] hover:bg-[#1a2876] text-white"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
