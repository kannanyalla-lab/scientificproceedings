import type { Author } from "@/db/schema";

export default function Authors({ authors }: { authors: Author[] }) {
  return (
    <>
      {authors.map((a, i) => (
        <span key={i}>
          {a.name}
          {a.aff ? <sup>{a.aff}</sup> : null}
          {i < authors.length - 1 ? ", " : ""}
        </span>
      ))}
    </>
  );
}
