"use client";

import Link from "next/link";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import type { Edge } from "@/lib/graph";
import type { ModelIndexEntry } from "@/lib/model-index";
import { ease, spring } from "@/lib/motion";
import type { Model, Organization } from "@/lib/schema";
import { ModelDetail } from "../ModelDetail";
import { CloseIcon, ExternalIcon } from "../icons";

export const PANEL_WIDTH = 420;

interface DetailPanelProps {
  model: Model;
  org?: Organization;
  incoming: Edge[];
  index: Record<string, ModelIndexEntry>;
  desktop: boolean;
  onSelectModel: (id: string) => void;
  onClose: () => void;
}

export function DetailPanel({ model, org, incoming, index, desktop, onSelectModel, onClose }: DetailPanelProps) {
  const drag = useDragControls();

  const header = (
    <div className="flex items-center justify-between gap-2 border-b border-rule px-5 py-2.5">
      <span className="flex items-center gap-2 text-[12.5px] text-ink-3">
        <span className="size-2 rounded-full" style={{ background: org?.color }} aria-hidden="true" />
        {org?.name}
      </span>
      <div className="flex items-center gap-1">
        <Link href={`/models/${model.id}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink">
          Full record <ExternalIcon width={12} height={12} />
        </Link>
        <button type="button" className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink" aria-label="Close details" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={model.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12, ease: ease.out } }}>
          <ModelDetail model={model} org={org} incoming={incoming} index={index} onSelectModel={onSelectModel} animated />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  if (desktop) {
    return (
      <motion.aside
        aria-label={`Details for ${model.name}`}
        className="absolute bottom-0 right-0 top-0 z-30 flex flex-col border-l border-rule bg-card shadow-[-24px_0_48px_-28px_rgb(27_26_23/0.35)]"
        style={{ width: PANEL_WIDTH }}
        initial={{ x: PANEL_WIDTH }}
        animate={{ x: 0 }}
        exit={{ x: PANEL_WIDTH, transition: { duration: 0.22, ease: ease.out } }}
        transition={spring.panel}
      >
        {header}
        {body}
      </motion.aside>
    );
  }

  return (
    <motion.aside
      aria-label={`Details for ${model.name}`}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[78dvh] flex-col rounded-t-2xl border-t border-rule bg-card shadow-[0_-20px_50px_-20px_rgb(27_26_23/0.4)]"
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
        if (info.offset.y > 110 || info.velocity.y > 600) onClose();
      }}
    >
      <div className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)} aria-hidden="true">
        <span className="h-1 w-10 rounded-full bg-rule-2" />
      </div>
      {header}
      {body}
    </motion.aside>
  );
}
