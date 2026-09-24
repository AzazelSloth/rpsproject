import { Card, SectionHeader } from "@/components/rps/ui";

export function PageErrorState({
  eyebrow,
  title,
  description,
  message,
}: {
  eyebrow: string;
  title: string;
  description: string;
  message: string;
}) {
  return (
    <section className="space-y-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <Card className="border border-muted bg-page p-8">
        <p className="text-sm font-semibold text-graphite">Chargement impossible</p>
        <p className="mt-2 text-sm leading-6 text-graphite">{message}</p>
      </Card>
    </section>
  );
}
