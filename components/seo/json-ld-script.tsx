interface JsonLdScriptProps {
  data: Record<string, unknown>;
}

/** Inserta datos estructurados JSON-LD para buscadores. */
export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
