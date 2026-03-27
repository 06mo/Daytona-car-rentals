type JsonLdProps = {
  schema: Record<string, unknown>;
};

export function JsonLd({ schema }: JsonLdProps) {
  return <script dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} type="application/ld+json" />;
}
