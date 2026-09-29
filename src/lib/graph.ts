import type { Model, RelationType } from "./schema";

export interface Edge {
  /** The older model. */
  from: string;
  /** The newer model, which declares the relation. */
  to: string;
  type: RelationType;
  note?: string;
}

export interface Graph {
  edges: Edge[];
  /** id -> edges where the model is the newer side. */
  parents: Map<string, Edge[]>;
  /** id -> edges where the model is the older side. */
  children: Map<string, Edge[]>;
}

export function buildGraph(models: Pick<Model, "id" | "relations">[]): Graph {
  const ids = new Set(models.map((m) => m.id));
  const edges: Edge[] = [];
  const parents = new Map<string, Edge[]>();
  const children = new Map<string, Edge[]>();
  for (const m of models) {
    for (const r of m.relations) {
      if (!ids.has(r.target)) continue;
      const edge: Edge = { from: r.target, to: m.id, type: r.type, note: r.note };
      edges.push(edge);
      push(parents, m.id, edge);
      push(children, r.target, edge);
    }
  }
  return { edges, parents, children };
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function walk(start: string, next: (id: string) => Edge[] | undefined, pick: (e: Edge) => string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    for (const e of next(id) ?? []) {
      const n = pick(e);
      if (!seen.has(n) && n !== start) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen;
}

export function ancestors(graph: Graph, id: string): Set<string> {
  return walk(id, (x) => graph.parents.get(x), (e) => e.from);
}

export function descendants(graph: Graph, id: string): Set<string> {
  return walk(id, (x) => graph.children.get(x), (e) => e.to);
}

/** The model plus everything it descends from and everything descending from it. */
export function lineage(graph: Graph, id: string): Set<string> {
  const set = new Set([id, ...ancestors(graph, id), ...descendants(graph, id)]);
  return set;
}

/** Returns each cycle found among edges of the given type, as a list of ids. */
export function findCycles(graph: Graph, type?: RelationType): string[][] {
  const adj = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (type && e.type !== type) continue;
    push(adj, e.from, e.to);
  }
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const cycles: string[][] = [];
  const path: string[] = [];

  const visit = (id: string) => {
    color.set(id, GREY);
    path.push(id);
    for (const n of adj.get(id) ?? []) {
      const c = color.get(n) ?? WHITE;
      if (c === GREY) cycles.push([...path.slice(path.indexOf(n)), n]);
      else if (c === WHITE) visit(n);
    }
    path.pop();
    color.set(id, BLACK);
  };

  for (const id of adj.keys()) if ((color.get(id) ?? WHITE) === WHITE) visit(id);
  return cycles;
}
