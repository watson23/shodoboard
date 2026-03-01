export interface MockMessage {
  role: "ai" | "user";
  text: string;
}

export interface MockConversation {
  nudgeId: string;
  title: string;
  messages: MockMessage[];
}

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    nudgeId: "nudge-1",
    title: "Defining a measure of success",
    messages: [
      {
        role: "ai",
        text: "You want order accuracy to improve. What does 'improve' look like specifically — fewer wrong items, faster corrections, fewer complaints?",
      },
      {
        role: "user",
        text: "Fewer incorrect items in delivered orders",
      },
      {
        role: "ai",
        text: "That's more specific. Do you know the current rate of incorrect orders? A baseline helps set a meaningful target.",
      },
      {
        role: "user",
        text: "We think it's around 8%",
      },
      {
        role: "ai",
        text: "So a measure could be: 'Reduce incorrect item rate from 8% to under 4%.' Does that feel meaningful?",
      },
    ],
  },
  {
    nudgeId: "nudge-2",
    title: "Linking to an outcome",
    messages: [
      {
        role: "ai",
        text: "This crash fix isn't linked to an outcome. Is it related to one of your existing goals, or is it a standalone maintenance task?",
      },
      {
        role: "user",
        text: "It's affecting checkout on Android devices",
      },
      {
        role: "ai",
        text: "Then it might connect to 'New users complete their first order' — if checkout is crashing, that directly blocks the outcome. Want to link it there?",
      },
    ],
  },
  {
    nudgeId: "nudge-3",
    title: "Validating before building",
    messages: [
      {
        role: "ai",
        text: "You're moving 'Build new checkout flow' to Ready, but there's been no discovery work. What makes you confident this is the right solution?",
      },
      {
        role: "user",
        text: "Users have been complaining about checkout for months",
      },
      {
        role: "ai",
        text: "Complaints tell you there's a problem, but not necessarily that a full rebuild is the fix. Have you looked at where users actually drop off in the current flow?",
      },
      {
        role: "user",
        text: "Not specifically, no",
      },
      {
        role: "ai",
        text: "A quick funnel analysis might reveal the biggest friction point — it could be as simple as a confusing payment step rather than a full rebuild. Want to add a discovery step first?",
      },
    ],
  },
  {
    nudgeId: "nudge-4",
    title: "Understanding user search behavior",
    messages: [
      {
        role: "ai",
        text: "You want to improve search relevance, but there's no discovery work attached. Do you know what users are actually searching for and where search fails them?",
      },
      {
        role: "user",
        text: "We see a lot of 'no results' pages, so we know it's broken",
      },
      {
        role: "ai",
        text: "That's a signal, but 'no results' could mean many things — typos, cuisine types you don't carry, location mismatches. Have you looked at the actual search queries?",
      },
      {
        role: "user",
        text: "Not really, we just assumed the algorithm needs tuning",
      },
      {
        role: "ai",
        text: "Analyzing the top 50 failed searches would take a few hours and could completely change your approach. You might discover users want to search by dish name but you only index restaurant names. Worth a look before jumping to 'tune the algorithm.'",
      },
    ],
  },
  {
    nudgeId: "nudge-6",
    title: "Learning from shipped work",
    messages: [
      {
        role: "ai",
        text: "You shipped delivery tracking and issue reporting — both aimed at reducing support tickets. Have you looked at whether support volume actually changed?",
      },
      {
        role: "user",
        text: "We haven't really checked the numbers yet",
      },
      {
        role: "ai",
        text: "That's common but risky. You're in the 'measuring' phase — this is where the learning happens. Without checking, you might ship more features that don't move the needle.",
      },
      {
        role: "user",
        text: "Good point. What should we look at?",
      },
      {
        role: "ai",
        text: "Start simple: compare support ticket volume from the month before launch to now. Break it down by category — are 'where is my order' tickets going down? If not, the tracking feature might not be solving what you thought it would.",
      },
    ],
  },
];
