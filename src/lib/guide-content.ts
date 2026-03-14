export interface GuideSection {
  id: string;
  title: string;
  iconName: string;
  content: string[];
}

export const guideSections: GuideSection[] = [
  {
    id: "what-is",
    title: "What is Shodoboard?",
    iconName: "Notebook",
    content: [
      "Shodoboard helps product teams focus on outcomes, not just shipping features. It combines a familiar kanban board with goal-setting, AI coaching, and discovery tracking.",
    ],
  },
  {
    id: "reading-the-board",
    title: "Reading the board",
    iconName: "Kanban",
    content: [
      "The board has two views you can toggle between: Tree View (shows the hierarchy of goals, outcomes, and work items) and Board View (a kanban with six columns).",
      "The six columns represent a flow from left to right: Opportunities → Discovering → Ready for Building → Building → Shipped → Measuring.",
      "The left side is about discovery — understanding what to build and why. The right side is delivery. \"Measuring\" closes the loop by checking if the work achieved what you expected.",
    ],
  },
  {
    id: "goals-outcomes",
    title: "Goals, outcomes, and work items",
    iconName: "TreeStructure",
    content: [
      "The board is organized in a hierarchy: Goals contain Outcomes, and Outcomes contain Work Items.",
      "Goals describe what the team is trying to achieve. Outcomes describe specific, measurable behavior changes or results — not just deliverables. Work items are the actual tasks and features.",
      "This structure helps connect day-to-day work back to why it matters. It's what makes Shodoboard different from a regular task board.",
    ],
  },
  {
    id: "ai-coaching",
    title: "AI coaching features",
    iconName: "Brain",
    content: [
      "Nudges are yellow indicators on cards. The AI reviews your board and suggests improvements — like clarifying an outcome or questioning whether a feature is connected to a goal.",
      "Sparring lets you have a conversation with the AI coach about a specific item or your entire board. It asks probing questions to help you think more clearly.",
      "The Coaching Agenda is a prioritized list of focus areas the AI identifies across your board. It highlights what deserves attention first.",
      "All coaching features are optional — the board works perfectly fine without them.",
    ],
  },
  {
    id: "working-with-board",
    title: "Working with the board",
    iconName: "CursorClick",
    content: [
      "Drag cards between columns to update their status. Click any card to see and edit its details.",
      "Use the toggle in the header to switch between Tree View and Board View — whichever helps you think better.",
      "The board saves automatically. If you're signed in, you can access your boards from the dashboard.",
    ],
  },
];
