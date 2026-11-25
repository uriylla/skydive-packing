export function ComingSoon({ title, milestone }: { title: string; milestone: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm opacity-70">Pendiente: {milestone} (ver PLAN.md).</p>
    </section>
  );
}
