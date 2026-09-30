import { monogram } from "@/lib/org";
import type { Organization } from "@/lib/schema";

/** A lab's badge: its monogram on a tile lit in the lab's color. */
export function OrgBadge({ org, size = 36, className = "" }: { org: Pick<Organization, "name" | "shortName" | "color">; size?: number; className?: string }) {
  const text = monogram(org);
  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center font-semibold tracking-[-0.02em] text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        fontSize: size * (text.length > 1 ? 0.3 : 0.44),
        background: `radial-gradient(120% 120% at 30% 20%, ${org.color}66, ${org.color}1f 55%, rgb(8 12 24 / 0.9) 100%)`,
        boxShadow: `inset 0 0 0 1px ${org.color}66, 0 0 18px -4px ${org.color}99`,
        textShadow: `0 0 12px ${org.color}`,
      }}
    >
      {text}
    </span>
  );
}

/** The shared row's badge: a 2×2 grid of its labs' colors. */
export function GroupBadge({ colors, size = 36 }: { colors: string[]; size?: number }) {
  const dots = colors.slice(0, 4);
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 grid-cols-2 place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        padding: size * 0.22,
        gap: size * 0.1,
        background: "radial-gradient(120% 120% at 30% 20%, rgb(160 175 230 / 0.22), rgb(8 12 24 / 0.9))",
        boxShadow: "inset 0 0 0 1px rgb(160 175 230 / 0.3)",
      }}
    >
      {dots.map((c, i) => (
        <span key={i} className="block rounded-[3px]" style={{ width: size * 0.2, height: size * 0.2, background: c, boxShadow: `0 0 6px ${c}` }} />
      ))}
    </span>
  );
}
