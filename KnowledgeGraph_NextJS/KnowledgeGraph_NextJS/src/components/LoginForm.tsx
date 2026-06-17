"use client";

import { useState } from "react";
import { login } from "@/lib/api";

export default function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      onLogin();
    } catch {
      setError("登录失败，请检查用户名和密码");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm"
      >
        <h1
          className="mb-1 text-xl font-bold text-text"
          style={{ fontFamily: '"Noto Serif SC", serif' }}
        >
          Knowledge Graph Explorer
        </h1>
        <p className="mb-6 text-sm text-muted">登录以继续</p>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm text-text">用户名</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="用户名"
          required
        />

        <label className="mb-1 block text-sm text-text">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="密码"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#2c3e6b" }}
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
}
