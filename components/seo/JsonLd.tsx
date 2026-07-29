type JsonLdProps = {
  data: Record<string, unknown> | ReadonlyArray<Record<string, unknown>>;
};

/** Renders one or more JSON-LD graph objects for search engines. */
export function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload.length === 1 ? payload[0] : payload),
      }}
    />
  );
}
