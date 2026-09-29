/** Turning points written onto the timeline's annotation track. Model ids are checked in tests. */
export interface Annotation {
  model: string;
  text: string;
}

export const ANNOTATIONS: Annotation[] = [
  { model: "transformer", text: "Attention is all you need" },
  { model: "gpt-3", text: "GPT-3 learns from a few examples" },
  { model: "chatgpt", text: "ChatGPT goes public" },
  { model: "llama", text: "LLaMA opens the weights era" },
  { model: "o1", text: "Models start to reason" },
  { model: "deepseek-r1", text: "Open reasoning with R1" },
  { model: "claude-mythos-preview", text: "A model held back from release" },
];
