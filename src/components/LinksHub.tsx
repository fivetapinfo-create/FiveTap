import { LinkActions } from "./LinkActions";

/**
 * Every link of a business in one place, grouped (reviews, the owner's app, tables, waiters),
 * each with Copy · Share · Open. Used by the founder's business page and by Fivetap Business.
 */
export type HubLink = { key: string; title: string; hint?: string; url: string; message: string; off?: boolean };
export type HubGroup = { title: string; links: HubLink[]; empty?: string };

export function LinksHub({ groups }: { groups: HubGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.title}>
          <p className="lk-group">{g.title}</p>
          {g.links.length ? (
            <ul className="lk-list">
              {g.links.map((l) => (
                <li key={l.key} className="lk-row">
                  <div className="lk-top">
                    <b>{l.title}</b>
                    {(l.hint || l.off) && <small>{l.off ? "Apagada" : l.hint}</small>}
                  </div>
                  <span className="code lk-url">{l.url}</span>
                  <LinkActions url={l.url} title={l.title} message={l.message} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ padding: "4px 16px 10px", margin: 0, fontSize: 14 }}>{g.empty}</p>
          )}
        </div>
      ))}
    </>
  );
}
