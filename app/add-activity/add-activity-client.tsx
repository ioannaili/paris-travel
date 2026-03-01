"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AddActivityForm } from "@/app/activities/types";

const initialForm: AddActivityForm = {
  name: "",
  description: "",
  area: "",
  type: "",
  google_maps_link: "",
};

export default function AddActivityClient() {
  const router = useRouter();
  const [form, setForm] = useState<AddActivityForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        area: form.area,
        type: form.type,
        google_maps_link: form.google_maps_link,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setError("Failed to save activity.");
      return;
    }

    router.push("/activities");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-4">
      <header className="mb-4 rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
        <p className="text-sm text-[var(--text-soft)]">Add Activity</p>
        <h1 className="text-3xl font-semibold leading-tight">New Activity</h1>
      </header>

      {error && (
        <p className="mb-3 rounded-2xl bg-[var(--electric-rose)]/10 px-4 py-3 text-sm font-medium text-[var(--electric-rose)]">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-3xl bg-[var(--surface)] p-4 shadow-sm">
        <input
          placeholder="Name"
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="min-h-12 rounded-2xl border-0 bg-[var(--bg-main)] px-4"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          className="min-h-24 rounded-2xl border-0 bg-[var(--bg-main)] px-4 py-3"
        />
        <input
          placeholder="Area"
          value={form.area}
          onChange={(event) => setForm({ ...form, area: event.target.value })}
          className="min-h-12 rounded-2xl border-0 bg-[var(--bg-main)] px-4"
        />
        <input
          placeholder="Type"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value })}
          className="min-h-12 rounded-2xl border-0 bg-[var(--bg-main)] px-4"
        />
        <input
          placeholder="Google Maps Link"
          value={form.google_maps_link}
          onChange={(event) => setForm({ ...form, google_maps_link: event.target.value })}
          className="min-h-12 rounded-2xl border-0 bg-[var(--bg-main)] px-4"
        />

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => router.push("/activities")}
            className="min-h-12 rounded-full bg-[var(--bg-main)] px-4 text-sm font-semibold text-[var(--text-main)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 rounded-full bg-[var(--sunset)] px-4 text-sm font-semibold text-white"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </main>
  );
}
