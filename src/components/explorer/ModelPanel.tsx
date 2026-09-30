"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import type { Edge } from "@/lib/graph";
import { formatDate, formatParameters, formatTokens, OPENNESS_LABEL, TYPE_LABEL } from "@/lib/format";
import type { ModelIndexEntry } from "@/lib/model-index";
import { ease, spring } from "@/lib/motion";
import type { CitableField, Model, Organization, RelationType } from "@/lib/schema";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChevronRightIcon,
  CloseIcon,
  CodeIcon,
  ContextIcon,
  CopyIcon,
  CpuIcon,
  DocumentIcon,
  ExternalIcon,
  GlobeIcon,
  LayersIcon,
  LockIcon,
  NodesIcon,
  SparkIcon,
  TagIcon,
  UnlockIcon,
} from "../icons";
import { OrgBadge } from "../OrgBadge";
import { ModelOrb } from "./ModelOrb";

export const PANEL_WIDTH = 384;

type Tab = "overview" | "technical" | "sources";
const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "technical", label: "Technical" },
  { value: "sources", label: "Sources" },
];

/** How a related model relates to the one on screen. */
const ROLE: Record<RelationType, { parent: string; child: string }> = {
  "successor-of": { parent: "Predecessor", child: "Successor" },
  "derived-from": { parent: "Base model", child: "Derived from it" },
  "distilled-from": { parent: "Distilled from", child: "Distilled into" },
  "inspired-by": { parent: "Influence", child: "Builds on it" },
};

const CiteContext = createContext<(sourceId: string) => void>(() => {});

/** Superscript source numbers; each opens the Sources tab at that source. */
function Cite({ model, field }: { model: Model; field: CitableField }) {
  const jump = useContext(CiteContext);
  const ids = model.citations[field];
  if (!ids?.length) return null;
  return (
    <sup className="ml-0.5 whitespace-nowrap text-[10px] font-semibold">
      {ids.map((id, i) => {
        const n = model.sources.findIndex((s) => s.id === id) + 1;
        return (
          <button key={id} type="button" onClick={() => jump(id)} className="px-px leading-none text-accent hover:underline" aria-label={`Source ${n}: ${model.sources[n - 1]?.title}`}>
            {i > 0 ? "," : ""}
            {n}
          </button>
        );
      })}
    </sup>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1.1rem_7rem_1fr] items-start gap-2.5 py-[7px] text-[13px] leading-snug">
      <span className="mt-px text-ink-3">{icon}</span>
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-1.5 mt-5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3 first:mt-0">{children}</h3>;
}

const LINK_LABELS: Record<keyof Model["links"], string> = {
  paper: "Paper",
  official: "Announcement",
  github: "GitHub",
  huggingface: "Hugging Face",
  modelCard: "Model card",
};

export interface ModelRecordProps {
  model: Model;
  org?: Organization;
  /** Edges where this model is the older side (models that build on it). */
  incoming: Edge[];
  /** Name, color and date of every model, for the related list. */
  index: Record<string, ModelIndexEntry>;
  orgById: Map<string, Organization>;
  modelOrg: (id: string) => string | undefined;
  /** The panel is showing the latest milestone because nothing is picked. */
  featured?: boolean;
  onSelectModel: (id: string) => void;
  onClose?: () => void;
}

/** A model's record: header, tabs (overview, technical, sources) and its related models. */
function ModelRecord({ model: m, org, incoming, index, orgById, modelOrg, featured, onSelectModel, onClose }: ModelRecordProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [flash, setFlash] = useState<string>();
  const [copied, setCopied] = useState(false);
  const year = m.releaseDate.slice(0, 4);

  useEffect(() => {
    if (!flash) return;
    const frame = requestAnimationFrame(() => document.getElementById(`src-${m.id}-${flash}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    const timer = setTimeout(() => setFlash(undefined), 1800);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [flash, m.id]);

  const jump = (sourceId: string) => {
    setTab("sources");
    setFlash(sourceId);
  };

  const related = [
    ...m.relations.map((r) => ({ id: r.target, role: ROLE[r.type].parent })),
    ...incoming.map((e) => ({ id: e.to, role: ROLE[e.type].child })),
  ]
    .filter((r) => index[r.id])
    .sort((a, b) => index[b.id].date.localeCompare(index[a.id].date));

  const primary = (["paper", "official"] as const).filter((k) => m.links[k]);
  const secondary = (["github", "huggingface", "modelCard"] as const).filter((k) => m.links[k]);
  const Open = m.openness === "closed" ? LockIcon : UnlockIcon;

  return (
    <CiteContext.Provider value={jump}>
      <section className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <header className="flex items-start gap-3 px-4 pb-3 pt-4">
          {org && <OrgBadge org={org} size={46} />}
          <div className="min-w-0 flex-1">
            {featured && <p className="kicker mb-0.5 text-[10.5px]">Latest milestone</p>}
            <h2 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-white">{m.name}</h2>
            <p className="mt-0.5 truncate text-[13px] text-ink-3">
              {org?.name ?? m.org}
              <Cite model={m} field="org" />
            </p>
          </div>
          <span className="shrink-0 rounded-lg border border-rule-2 bg-white/[0.04] px-2 py-1 text-[12.5px] font-medium tabular-nums text-ink-2">{year}</span>
          {onClose && (
            <button type="button" className="-mr-1.5 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-white/[0.07] hover:text-ink" aria-label="Close details" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </header>

        <div role="tablist" aria-label="Record" className="flex gap-1 border-b border-rule px-2.5">
          {TABS.map((t) => {
            const active = t.value === tab;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                id={`tab-${t.value}`}
                aria-selected={active}
                aria-controls={`panel-${t.value}`}
                onClick={() => setTab(t.value)}
                className={`relative px-2.5 py-2.5 text-[13px] font-medium transition-colors ${active ? "text-white" : "text-ink-3 hover:text-ink-2"}`}
              >
                {t.label}
                {active && <motion.span layoutId="record-tab" transition={spring.snappy} className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[linear-gradient(90deg,#9d8cff,#5f8dff)] shadow-[0_0_10px_#8b7bff]" />}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${m.id}-${tab}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.22, ease: ease.out }}>
              {tab === "overview" && (
                <>
                  <div className="-mx-4 -mt-4 mb-4 h-[150px] border-b border-rule bg-[rgb(4_6_14/0.6)] short:h-[118px]">
                    <ModelOrb seed={m.id} color={org?.color ?? "#9d8cff"} />
                  </div>
                  <p className="text-[13.5px] leading-[1.65] text-ink-2">
                    {m.summary}
                    <Cite model={m} field="summary" />
                  </p>
                  <dl className="mt-3 border-t border-rule pt-1.5">
                    <Fact icon={<CalendarIcon width={15} height={15} />} label="Release date">
                      {formatDate(m.releaseDate)}
                      <Cite model={m} field="releaseDate" />
                    </Fact>
                    <Fact icon={<LayersIcon width={15} height={15} />} label="Model family">
                      {m.family}
                    </Fact>
                    <Fact icon={<TagIcon width={15} height={15} />} label="Type">
                      {TYPE_LABEL[m.type]}
                    </Fact>
                    <Fact icon={<Open width={15} height={15} />} label="Openness">
                      {OPENNESS_LABEL[m.openness]}
                      <Cite model={m} field="openness" />
                    </Fact>
                    <Fact icon={<NodesIcon width={15} height={15} />} label="Parameters">
                      {formatParameters(m.parameters)}
                      <Cite model={m} field="parameters" />
                    </Fact>
                    {m.contextWindow && (
                      <Fact icon={<ContextIcon width={15} height={15} />} label="Context window">
                        {formatTokens(m.contextWindow)} tokens
                        <Cite model={m} field="contextWindow" />
                      </Fact>
                    )}
                    <Fact icon={<SparkIcon width={15} height={15} />} label="Modalities">
                      {m.modalities.input.join(", ")} → {m.modalities.output.join(", ")}
                      <Cite model={m} field="modalities" />
                    </Fact>
                  </dl>
                  {m.capabilities.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Capabilities">
                      {m.capabilities.map((c) => (
                        <li key={c} className="rounded-lg border border-rule bg-white/[0.03] px-2 py-0.5 text-[12px] text-ink-2">
                          {c}
                        </li>
                      ))}
                      <li className="self-center">
                        <Cite model={m} field="capabilities" />
                      </li>
                    </ul>
                  )}
                  {(primary.length > 0 || secondary.length > 0) && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {primary.map((k) => (
                        <a
                          key={k}
                          href={m.links[k]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[rgb(157_140_255/0.45)] bg-[linear-gradient(180deg,rgb(143_125_255/0.22),rgb(95_141_255/0.08))] text-[13px] font-semibold text-white transition-shadow hover:shadow-[0_0_20px_-4px_rgb(143_125_255/0.8)]"
                        >
                          {k === "paper" ? <DocumentIcon width={15} height={15} /> : <GlobeIcon width={15} height={15} />}
                          {k === "paper" ? "View paper" : "Official site"}
                        </a>
                      ))}
                      {secondary.map((k) => (
                        <a
                          key={k}
                          href={m.links[k]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rule bg-white/[0.03] text-[12.5px] font-medium text-ink-2 transition-colors hover:border-rule-2 hover:text-ink"
                        >
                          {k === "github" ? <CodeIcon width={14} height={14} /> : <ExternalIcon width={13} height={13} />}
                          {LINK_LABELS[k]}
                        </a>
                      ))}
                    </div>
                  )}
                  {related.length > 0 && (
                    <div className="mt-5 hidden short:block">
                      <SectionTitle>Related models</SectionTitle>
                      <div className="-mx-2">
                        <RelatedList related={related} index={index} orgById={orgById} modelOrg={modelOrg} onSelectModel={onSelectModel} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === "technical" && (
                <>
                  <SectionTitle>Specifications</SectionTitle>
                  <dl>
                    <Fact icon={<CpuIcon width={15} height={15} />} label="Architecture">
                      {m.architecture}
                      <Cite model={m} field="architecture" />
                    </Fact>
                    <Fact icon={<NodesIcon width={15} height={15} />} label="Parameters">
                      {formatParameters(m.parameters)}
                      <Cite model={m} field="parameters" />
                    </Fact>
                    <Fact icon={<ContextIcon width={15} height={15} />} label="Context window">
                      {m.contextWindow ? `${formatTokens(m.contextWindow)} tokens` : "Not stated"}
                      <Cite model={m} field="contextWindow" />
                    </Fact>
                    {m.trainingCutoff && (
                      <Fact icon={<CalendarIcon width={15} height={15} />} label="Training cutoff">
                        {formatDate(m.trainingCutoff)}
                        <Cite model={m} field="trainingCutoff" />
                      </Fact>
                    )}
                    <Fact icon={<SparkIcon width={15} height={15} />} label="Input">
                      {m.modalities.input.join(", ")}
                    </Fact>
                    <Fact icon={<SparkIcon width={15} height={15} />} label="Output">
                      {m.modalities.output.join(", ")}
                      <Cite model={m} field="modalities" />
                    </Fact>
                    {m.license && (
                      <Fact icon={<DocumentIcon width={15} height={15} />} label="License">
                        {m.license}
                        <Cite model={m} field="license" />
                      </Fact>
                    )}
                  </dl>
                  {m.variants.length > 0 && (
                    <>
                      <div className="mb-1.5 mt-5 flex items-baseline gap-1">
                        <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">Variants</h3>
                        <Cite model={m} field="variants" />
                      </div>
                      <ul>
                        {m.variants.map((v) => (
                          <li key={v.name} className="flex items-baseline justify-between gap-3 border-t border-rule py-2 text-[13px]">
                            <span className="text-ink">{v.name}</span>
                            <span className="text-right text-[12.5px] text-ink-3">
                              {v.parameters?.disclosed ? formatParameters(v.parameters) : v.notes}
                              {v.parameters?.disclosed && v.notes ? ` · ${v.notes}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}

              {tab === "sources" && (
                <>
                  <SectionTitle>Sources</SectionTitle>
                  <ol className="space-y-1">
                    {m.sources.map((s, i) => (
                      <li
                        key={s.id}
                        id={`src-${m.id}-${s.id}`}
                        className={`flex scroll-mt-4 gap-2.5 rounded-lg px-2 py-1.5 text-[13px] leading-snug transition-colors duration-500 ${flash === s.id ? "bg-highlight" : ""}`}
                      >
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
                  <p className="mt-4 rounded-xl border border-rule bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-ink-3">
                    {m.status === "verified"
                      ? `Verified by a reviewer. Updated ${formatDate(m.updated)}.`
                      : `Draft record, compiled by an AI assistant from the sources above and not yet reviewed by a person. Updated ${formatDate(m.updated)}.`}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-rule px-4 py-2.5 text-[12.5px]">
          <Link href={`/models/${m.id}`} className="inline-flex items-center gap-1.5 font-medium text-ink-2 transition-colors hover:text-white">
            Full record <ArrowRightIcon width={13} height={13} />
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-ink-3 transition-colors hover:bg-white/[0.06] hover:text-ink"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/?model=${m.id}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              } catch {
                // Clipboard can be unavailable (permissions, insecure context); nothing to undo.
              }
            }}
          >
            <CopyIcon width={13} height={13} /> {copied ? "Link copied" : "Copy link"}
          </button>
        </footer>
      </section>

      {related.length > 0 && (
        <section className="glass max-h-[38%] shrink-0 overflow-y-auto rounded-2xl px-2 pb-2 pt-3 short:hidden" aria-label="Related models">
          <h3 className="mb-1 px-2 text-[14px] font-semibold text-white">Related models</h3>
          <RelatedList related={related} index={index} orgById={orgById} modelOrg={modelOrg} onSelectModel={onSelectModel} />
        </section>
      )}
    </CiteContext.Provider>
  );
}

interface Related {
  id: string;
  role: string;
}

function RelatedList({
  related,
  index,
  orgById,
  modelOrg,
  onSelectModel,
}: { related: Related[] } & Pick<ModelRecordProps, "index" | "orgById" | "modelOrg" | "onSelectModel">) {
  return (
    <ul>
      {related.map((r) => {
        const entry = index[r.id];
        const org = orgById.get(modelOrg(r.id) ?? "");
        return (
          <li key={`${r.role}-${r.id}`}>
            <button type="button" onClick={() => onSelectModel(r.id)} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.05]">
              {org && <OrgBadge org={org} size={32} />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{entry.name}</span>
                <span className="block truncate text-[12px] text-ink-3">{r.role}</span>
              </span>
              <span className="rounded-md border border-rule px-1.5 py-0.5 text-[11.5px] tabular-nums text-ink-3">{entry.date.slice(0, 4)}</span>
              <ChevronRightIcon width={15} height={15} className="text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface ModelPanelProps extends ModelRecordProps {
  /** `column` sits beside the chart on wide screens; `overlay` slides over it; `sheet` rises from the bottom on phones. */
  variant: "column" | "overlay" | "sheet";
}

export function ModelPanel({ variant, ...props }: ModelPanelProps) {
  const drag = useDragControls();
  const label = `Details for ${props.model.name}`;

  if (variant === "column") {
    return (
      <aside aria-label={label} className="flex min-h-0 w-[340px] shrink-0 flex-col gap-3 2xl:w-[384px]">
        <ModelRecord {...props} />
      </aside>
    );
  }

  if (variant === "overlay") {
    return (
      <motion.aside
        aria-label={label}
        className="absolute bottom-3 right-3 top-0 z-30 flex flex-col gap-3 sm:right-6"
        style={{ width: PANEL_WIDTH }}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0, transition: { duration: 0.18, ease: ease.out } }}
        transition={spring.panel}
      >
        <ModelRecord {...props} />
      </motion.aside>
    );
  }

  return (
    <motion.aside
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[82dvh] flex-col gap-2 rounded-t-3xl border-t border-rule-2 bg-[rgb(6_9_18/0.98)] p-2 shadow-[0_-24px_60px_-20px_rgb(0_0_0/0.9)]"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%", transition: { duration: 0.22, ease: ease.out } }}
      transition={spring.panel}
      drag="y"
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.7 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 110 || info.velocity.y > 600) props.onClose?.();
      }}
    >
      <div className="flex cursor-grab touch-none justify-center pb-1 pt-1 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)} aria-hidden="true">
        <span className="h-1 w-10 rounded-full bg-rule-2" />
      </div>
      <ModelRecord {...props} />
    </motion.aside>
  );
}
