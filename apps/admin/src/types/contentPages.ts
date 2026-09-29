export interface AboutPageContent {
  heroTitle: string;
  heroBody: string;
  storyTitle: string;
  storyBody: string;
  principlesTitle: string;
  principles: { title: string; body: string }[];
  timelineTitle: string;
  timeline: { year: string; note: string }[];
  teamTitle: string;
  team: { name: string; role: string }[];
  updatedAt?: string;
}

export interface LegalDocumentContent {
  key: "terms" | "privacy" | "shipping" | "returns" | "warranty";
  label: string;
  title: string;
  body: string;
  updatedAt: string;
}
