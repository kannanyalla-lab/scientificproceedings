"use client";

export default function DeleteButton({ action, label }: { action: () => Promise<void>; label: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(`Delete this ${label}? This can't be undone.`)) e.preventDefault(); }}>
      <button className="btn btn--danger btn--sm">Delete</button>
    </form>
  );
}
