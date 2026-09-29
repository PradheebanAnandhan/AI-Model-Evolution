"use client";

// Rendered in the chart's detail panel (animated) and on static /models/[id] pages (not animated).
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { Edge } from "@/lib/graph";
import { formatDate, formatParameters, formatTokens, OPENNESS_LABEL, RELATION_LABEL, TYPE_LABEL } from "@/lib/format";
import type { ModelIndexEntry } from "@/lib/model-index";
import { riseIn, stagger } from "@/lib/motion";
import type { CitableField, Model, Organization } from "@/lib/schema";
import { ExternalIcon } from "./icons";

export interface ModelDetailProps {
  model: Model;
  org?: Organization;
  /** Edges where this model is the older side (models that build on it). */
  incoming: Edge[];
  /** Name, color and date of every model, for lineage links. */
  index: Record<string, ModelIndexEntry>;
  /** When set, lineage links select in place instead of navigating to model pages. */
  onSelectModel?: (id: string) => void;
  headingLevel?: "h1" | "h2";
  animated?: boolean;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.list * 2, delayChildren: 0.04 } },
};

function Cite({ model, field }: { model: Model; field: CitableField }) {
  const ids = model.citations[field];
  if (!ids?.length) return null;
  return (
    <sup className="ml-0.5 whitespace-nowrap text-[10.5px] font-semibold">
      {ids.map((id, i) => {
        const n = model.sources.findIndex((s) => s.id === id) + 1;
        return (
          <a key={id} href={`#src-${model.id}-${id}`} className="text-accent hover:underline" aria-label={`Source ${n}: ${model.sources[n - 1]?.title}`}>
            {i > 0 ? "," : ""}
            {n}
          </a>
        );
      })}
    </sup>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 border-t border-rule py-2.5 text-[14px]">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

/** A section heading; the citation sits beside it, not inside, so it stays out of the heading's accessible name. */
function SectionTitle({ children, cite }: { children: ReactNode; cite?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline gap-1">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{children}</h3>
      {cite}
    </div>
  );
}

const LINK_LABELS: Record<keyof Model["links"], string> = {
  paper: "Paper",
  official: "Announcement",
  github: "GitHub",
  huggingface: "Hugging Face",
  modelCard: "Model card",
};

function CopyLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center rounded-md border border-rule-2 px-2 py-1 text-[12px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/explore?model=${id}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard can be unavailable (permissions, insecure context); nothing to undo.
        }
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={copied ? "done" : "copy"} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.12 }}>
          {copied ? "Link copied" : "Copy link"}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function ModelDetail({ model: m, org, incoming, index, onSelectModel, headingLevel = "h2", animated = false }: ModelDetailProps) {
  const Heading = headingLevel === "h1" ? motion.h1 : motion.h2;

  const modelLink = (id: string) => {
    const entry = index[id];
    const inner = (
      <>
        <span className="size-2 shrink-0 rounded-full" style={{ background: entry?.color }} aria-hidden="true" />
        <span className="font-medium text-ink underline decoration-rule-2 underline-offset-[3px] group-hover:decoration-ink">{entry?.name ?? id}</span>
        {entry && <span className="ml-auto text-[12px] tabular-nums text-ink-3">{formatDate(entry.date)}</span>}
      </>
    );
    const cls = "group flex w-full items-center gap-2 py-1 text-left text-[14px]";
    return onSelectModel ? (
      <button type="button" className={cls} onClick={() => onSelectModel(id)}>
        {inner}
      </button>
    ) : (
      <Link href={`/models/${id}`} className={cls}>
        {inner}
      </Link>
    );
  };

  const links = (Object.keys(LINK_LABELS) as (keyof Model["links"])[]).filter((k) => m.links[k]);

  return (
    <motion.article variants={container} initial={animated ? "hidden" : false} animate="show">
      <motion.header variants={riseIn}>
        <p className="text-[13px] text-ink-3">
          {org?.name ?? m.org}
          <Cite model={m} field="org" /> · {m.family} family
        </p>
        <Heading className="font-display mt-1 text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">{m.name}</Heading>
        {m.aliases.length > 0 && <p className="mt-1 text-[13px] text-ink-3">Also known as {m.aliases.join(", ")}</p>}
        <p className="mt-3 text-[14px] text-ink-2">
          Released {formatDate(m.releaseDate)}
          <Cite model={m} field="releaseDate" /> · {TYPE_LABEL[m.type]} · {OPENNESS_LABEL[m.openness]}
          <Cite model={m} field="openness" />
        </p>
        {onSelectModel && (
          <div className="mt-3">
            <CopyLink id={m.id} />
          </div>
        )}
      </motion.header>

      <motion.p variants={riseIn} className="font-display mt-5 text-[18px] leading-[1.55] text-ink-2">
        {m.summary}
        <Cite model={m} field="summary" />
      </motion.p>

      <motion.section variants={riseIn} className="mt-6" aria-label="At a glance">
        <SectionTitle>At a glance</SectionTitle>
        <dl className="border-b border-rule">
          <Row label="Parameters">
            {formatParameters(m.parameters)}
            <Cite model={m} field="parameters" />
          </Row>
          {m.contextWindow && (
            <Row label="Context window">
              {formatTokens(m.contextWindow)} tokens
              <Cite model={m} field="contextWindow" />
            </Row>
          )}
          <Row label="Architecture">
            {m.architecture}
            <Cite model={m} field="architecture" />
          </Row>
          {m.license && (
            <Row label="License">
              {m.license}
              <Cite model={m} field="license" />
            </Row>
          )}
          {m.trainingCutoff && (
            <Row label="Training cutoff">
              {formatDate(m.trainingCutoff)}
              <Cite model={m} field="trainingCutoff" />
            </Row>
          )}
          <Row label="Input → output">
            {m.modalities.input.join(", ")} → {m.modalities.output.join(", ")}
            <Cite model={m} field="modalities" />
          </Row>
          {m.capabilities.length > 0 && (
            <Row label="Capabilities">
              {m.capabilities.join(", ")}
              <Cite model={m} field="capabilities" />
            </Row>
          )}
        </dl>
      </motion.section>

      {m.variants.length > 0 && (
        <motion.section variants={riseIn} className="mt-6">
          <SectionTitle cite={<Cite model={m} field="variants" />}>Variants</SectionTitle>
          <ul className="border-b border-rule">
            {m.variants.map((v) => (
              <li key={v.name} className="flex items-baseline justify-between gap-3 border-t border-rule py-2 text-[14px]">
                <span className="text-ink">{v.name}</span>
                <span className="text-right text-[13px] text-ink-3">
                  {v.parameters?.disclosed ? formatParameters(v.parameters) : v.notes}
                  {v.parameters?.disclosed && v.notes ? ` · ${v.notes}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {(m.relations.length > 0 || incoming.length > 0) && (
        <motion.section variants={riseIn} className="mt-6">
          <SectionTitle cite={<Cite model={m} field="relations" />}>Lineage</SectionTitle>
          {m.relations.length > 0 && (
            <ul className="mb-2">
              {m.relations.map((r) => (
                <li key={`out-${r.target}`}>
                  <span className="text-[12px] text-ink-3">{RELATION_LABEL[r.type].forward}</span>
                  {modelLink(r.target)}
                  {r.note && <span className="-mt-0.5 block pb-1 text-[12.5px] text-ink-3">{r.note}</span>}
                </li>
              ))}
            </ul>
          )}
          {incoming.length > 0 && (
            <ul>
              {incoming.map((e) => (
                <li key={`in-${e.to}`}>
                  <span className="text-[12px] text-ink-3">{RELATION_LABEL[e.type].backward}</span>
                  {modelLink(e.to)}
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}

      {links.length > 0 && (
        <motion.section variants={riseIn} className="mt-6">
          <SectionTitle>Links</SectionTitle>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[14px]">
            {links.map((k) => (
              <li key={k}>
                <a href={m.links[k]} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                  {LINK_LABELS[k]}
                  <ExternalIcon width={12} height={12} />
                </a>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      <motion.section variants={riseIn} className="mt-6">
        <SectionTitle>Sources</SectionTitle>
        <ol className="space-y-2">
          {m.sources.map((s, i) => (
            <li key={s.id} id={`src-${m.id}-${s.id}`} className="flex scroll-mt-4 gap-2.5 text-[13px] leading-snug">
              <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-accent">{i + 1}</span>
              <span className="min-w-0">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="link break-words text-ink">
                  {s.title}
                </a>
                <span className="text-ink-3">
                  {s.publisher ? `, ${s.publisher}` : ""}
                  {s.accessed ? `. Checked ${formatDate(s.accessed)}.` : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </motion.section>

      <motion.footer variants={riseIn} className="mt-6 border-t border-rule pt-3 text-[12.5px] leading-relaxed text-ink-3">
        {m.status === "verified"
          ? `Verified by a reviewer. Updated ${formatDate(m.updated)}.`
          : `Draft record, compiled by an AI assistant from the sources above and not yet reviewed by a person. Updated ${formatDate(m.updated)}.`}
      </motion.footer>
    </motion.article>
  );
}
