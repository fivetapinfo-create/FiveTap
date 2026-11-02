/** Grey placeholders shown the instant a section is tapped, while its data loads. */
export function Bar({ w = "100%", h = 14 }: { w?: number | string; h?: number }) {
  return <span className="sk" style={{ width: w, height: h }} />;
}

export function PageSkeleton({ kpis = 4, panels = 2, hero = false }: { kpis?: number; panels?: number; hero?: boolean }) {
  return (
    <main className="container admin-main" aria-busy="true" aria-label="Cargando">
      <div style={{ display: "grid", gap: 10 }}>
        <Bar w={220} h={30} />
        <Bar w={140} />
      </div>
      {hero && <div className="sk sk-hero" />}
      {kpis > 0 && (
        <div className="kpis">
          {Array.from({ length: kpis }, (_, i) => (
            <div key={i} className="kpi" style={{ display: "grid", gap: 10 }}>
              <Bar w="60%" />
              <Bar w="40%" h={28} />
            </div>
          ))}
        </div>
      )}
      {Array.from({ length: panels }, (_, i) => (
        <section key={i} className="panel" style={{ padding: 20, display: "grid", gap: 14 }}>
          <Bar w={180} h={18} />
          <Bar />
          <Bar w="85%" />
          <Bar w="70%" />
        </section>
      ))}
    </main>
  );
}
