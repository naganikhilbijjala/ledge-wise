// Changelog data for LedgeWise
// Add new entries at the top of the array

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: {
    type: "feature" | "improvement" | "fix";
    text: string;
  }[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.2.0",
    date: "2025-01-21",
    title: "Day Book & Changelog",
    description: "New Day Book feature for daily transaction tracking and this changelog page.",
    changes: [
      {
        type: "feature",
        text: "Day Book - View daily transaction summaries with opening/closing balances",
      },
      {
        type: "feature",
        text: "Filter day book by account and date range with quick presets",
      },
      {
        type: "feature",
        text: "Changelog page to track new features and updates",
      },
      {
        type: "improvement",
        text: "Added 'What's New' badge to highlight recent updates",
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2025-01-15",
    title: "Initial Release",
    description: "First version of LedgeWise with core functionality.",
    changes: [
      {
        type: "feature",
        text: "Dashboard with net position, account balances, and recent transactions",
      },
      {
        type: "feature",
        text: "Quick Entry form for fast transaction recording",
      },
      {
        type: "feature",
        text: "Account management (Cash, Bank, Loans)",
      },
      {
        type: "feature",
        text: "Party management (Customers, Vendors, Lenders, Borrowers)",
      },
      {
        type: "feature",
        text: "Transaction listing with filters",
      },
      {
        type: "feature",
        text: "Stock inventory tracking",
      },
      {
        type: "feature",
        text: "Tally export for official transactions",
      },
      {
        type: "feature",
        text: "User authentication and multi-user support",
      },
    ],
  },
];

// Get the latest version
export const latestVersion = changelog[0]?.version || "0.0.0";

// Check if a version is newer than another
export function isNewerVersion(current: string, stored: string): boolean {
  const currentParts = current.split(".").map(Number);
  const storedParts = stored.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if ((currentParts[i] || 0) > (storedParts[i] || 0)) return true;
    if ((currentParts[i] || 0) < (storedParts[i] || 0)) return false;
  }
  return false;
}
