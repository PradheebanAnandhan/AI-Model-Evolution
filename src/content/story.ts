export interface Chapter {
  id: string;
  /** Inclusive era window as YYYY-MM. */
  from: string;
  to: string;
  title: string;
  body: string;
  /** Models that ignite and get labels while this chapter is on screen. */
  models: string[];
}

/** The scroll-driven story on the landing page. Every model id must exist (checked in tests). */
export const CHAPTERS: Chapter[] = [
  {
    id: "attention",
    from: "2017-01",
    to: "2017-12",
    title: "Attention is all you need",
    body: "Researchers at Google replace recurrence with self-attention. The Transformer trains faster, parallelizes across hardware, and becomes the backbone of nearly every model that follows.",
    models: ["transformer"],
  },
  {
    id: "pretraining",
    from: "2018-01",
    to: "2019-12",
    title: "Pre-train, then adapt",
    body: "Models learn language from raw text first, then adapt to tasks. OpenAI's GPT line generates text and Google's BERT learns to understand it. GPT-2's staged release starts the debate about how openly to publish.",
    models: ["gpt-1", "bert", "gpt-2", "t5"],
  },
  {
    id: "scale",
    from: "2020-01",
    to: "2021-12",
    title: "Scale changes everything",
    body: "At 175 billion parameters, GPT-3 learns new tasks from a few examples in its prompt. The same recipe is pointed at images with DALL·E and at code with Codex, while open collectives like EleutherAI start reproducing it.",
    models: ["gpt-3", "dall-e", "codex", "lamda", "gpt-j"],
  },
  {
    id: "alignment",
    from: "2022-01",
    to: "2022-12",
    title: "Alignment meets the public",
    body: "Reinforcement learning from human feedback teaches models to follow instructions. Stable Diffusion puts image generation on consumer GPUs, and ChatGPT's launch in November turns language models into a mass-market product.",
    models: ["instructgpt", "palm", "stable-diffusion", "bloom", "whisper", "chatgpt"],
  },
  {
    id: "open-weights",
    from: "2023-01",
    to: "2023-12",
    title: "The open-weights explosion",
    body: "Meta's LLaMA weights spread and spawn thousands of fine-tunes, Mistral ships Apache-licensed models, and GPT-4 raises the ceiling with image input. Frontier and open models now race in parallel.",
    models: ["llama", "gpt-4", "claude-1", "llama-2", "mistral-7b", "mixtral-8x7b", "gemini-1"],
  },
  {
    id: "multimodal",
    from: "2024-01",
    to: "2024-08",
    title: "Multimodal, long-context, everywhere",
    body: "Context windows stretch to a million tokens, models see, hear and speak in real time, and a 405-billion-parameter open-weight model arrives.",
    models: ["gemini-1.5", "claude-3", "sora", "gpt-4o", "claude-3.5-sonnet", "llama-3.1"],
  },
  {
    id: "reasoning",
    from: "2024-09",
    to: "2025-12",
    title: "The reasoning era",
    body: "Models trained with reinforcement learning think before they answer. DeepSeek-R1 shows it can be done in the open, and within a year thinking modes are standard across the major labs.",
    models: ["o1", "deepseek-r1", "claude-3.7-sonnet", "gemini-2.5", "qwen3", "kimi-k2", "gpt-oss", "gpt-5"],
  },
  {
    id: "frontier",
    from: "2026-01",
    to: "2026-09",
    title: "Agents and trillion-parameter frontiers",
    body: "Labs compete on long-running agents and computer use. Open-weight models pass two trillion parameters, and the most capable systems ship with tiered safeguards, or, like Claude Mythos Preview, stay out of public release.",
    models: ["claude-mythos-preview", "gemma-4", "deepseek-v4", "gemini-3.5", "kimi-k3", "qwen3.8", "claude-fable-5.1", "gpt-6"],
  },
];
