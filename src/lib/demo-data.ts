import type { Board, Card, Column, WorkspaceData } from "./types";

export const labels = ["Product", "Design", "Engineering", "Ops"] as const;

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${randomId}`;
}

export function createStarterWorkspace(): WorkspaceData {
  const boardId = createId("board");
  const todoId = createId("list");
  const doingId = createId("list");
  const doneId = createId("list");

  const boards: Board[] = [
    {
      id: boardId,
      name: "Launch board",
      createdAt: nowIso(),
    },
  ];

  const columns: Column[] = [
    { id: todoId, boardId, title: "To do", position: 0 },
    { id: doingId, boardId, title: "Doing", position: 1 },
    { id: doneId, boardId, title: "Done", position: 2 },
  ];

  const cards: Card[] = [
    {
      id: createId("card"),
      columnId: todoId,
      title: "Scope onboarding flow",
      description: "Define the sign-in states, empty states, and first board defaults.",
      dueDate: "2026-07-03",
      label: "Product",
      position: 0,
    },
    {
      id: createId("card"),
      columnId: todoId,
      title: "Write RLS policies",
      description: "Restrict boards, lists, and cards to rows owned through the current user.",
      dueDate: "2026-07-05",
      label: "Engineering",
      position: 1,
    },
    {
      id: createId("card"),
      columnId: doingId,
      title: "Polish drag states",
      description: "Make card movement feel immediate while positions save in the background.",
      dueDate: "2026-07-01",
      label: "Design",
      position: 0,
    },
    {
      id: createId("card"),
      columnId: doneId,
      title: "Create seed board",
      description: "Ship a useful default board for new accounts.",
      dueDate: "2026-06-28",
      label: "Ops",
      position: 0,
    },
  ];

  return {
    boards,
    columns,
    cards,
    activeBoardId: boardId,
  };
}
