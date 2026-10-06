import { theme } from "../../../shared/lib/theme";

// Customer-app-only refinement of the shared theme: softer, tighter shadows for a lighter, more premium feel.
// Imported once from the root layout so every inline-styled card picks it up.
theme.shadow.subtle = "0 1px 2px rgba(10,35,55,0.05)";
theme.shadow.card = "0 1px 2px rgba(10,35,55,0.04), 0 6px 18px rgba(10,35,55,0.05)";
theme.shadow.raised = "0 2px 4px rgba(10,35,55,0.05), 0 14px 32px rgba(10,35,55,0.09)";
theme.shadow.button = "0 4px 12px rgba(10,127,166,0.16)";
