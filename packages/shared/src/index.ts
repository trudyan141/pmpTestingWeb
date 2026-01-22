import { z } from 'zod';

// --- Enums ---
export enum CrawlMode {
  AUTO = 'AUTO',
  RECORDER = 'RECORDER',
}

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  WAITING_FOR_INPUT = 'WAITING_FOR_INPUT',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum CrawlStrategy {
  API_INTERCEPT = 'API_INTERCEPT',
  DOM_HEURISTIC = 'DOM_HEURISTIC',
  RECORDED = 'RECORDED',
}

// --- DTOs ---

export const SelectorMapSchema = z.object({
  questionContainer: z.string().optional(),
  questionText: z.string().optional(),
  choiceContainer: z.string().optional(),
  choiceItem: z.string().optional(),
  correctMarker: z.string().optional(),
  explanation: z.string().optional(),
  nextButton: z.string().optional(),
});

export type SelectorMap = z.infer<typeof SelectorMapSchema>;

export const StartCrawlSchema = z.object({
  loginUrl: z.string().url(),
  testUrl: z.string().url(),
  username: z.string(),
  password: z.string(),
  mode: z.nativeEnum(CrawlMode),
  options: z.object({
    includeExplanation: z.boolean().default(true),
    maxQuestions: z.number().default(500),
    headless: z.boolean().default(true)
  }).optional()
});

export type StartCrawlRequest = z.infer<typeof StartCrawlSchema>;

export const InteractiveOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  metadata: z.any().optional(),
});

export type InteractiveOption = z.infer<typeof InteractiveOptionSchema>;

export const CrawlJobResponseSchema = z.object({
  jobId: z.string(),
  testId: z.string().nullable().optional(),
  status: z.nativeEnum(JobStatus),
  progress: z.number(),
  step: z.string(),
  totalQuestions: z.number(),
  errorMessage: z.string().nullable().optional(),
  interactiveOptions: z.array(InteractiveOptionSchema).optional(),
});

export type CrawlJobResponse = z.infer<typeof CrawlJobResponseSchema>;

// --- Models ---

export interface Choice {
  id: string;
  label?: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  indexNumber: number;
  questionText: string;
  explanation?: string;
  choices: Choice[];
}

export interface TestSession {
  id: string;
  sourceTestUrl: string;
  sourceLoginUrl: string;
  status: JobStatus;
  topic?: string;
  testName?: string;
  createdAt: Date;
  updatedAt: Date;
  questions?: Question[];
  _count?: {
    questions: number;
  };
}
