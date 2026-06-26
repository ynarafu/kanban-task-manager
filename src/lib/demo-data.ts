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
      name: "リリース準備ボード",
      createdAt: nowIso(),
    },
  ];

  const columns: Column[] = [
    { id: todoId, boardId, title: "未着手", position: 0 },
    { id: doingId, boardId, title: "進行中", position: 1 },
    { id: doneId, boardId, title: "完了", position: 2 },
  ];

  const cards: Card[] = [
    {
      id: createId("card"),
      columnId: todoId,
      title: "オンボーディング導線を整理",
      description: "ログイン状態、空状態、初期ボードの表示内容を決める。",
      dueDate: "2026-07-03",
      label: "Product",
      position: 0,
    },
    {
      id: createId("card"),
      columnId: todoId,
      title: "RLS ポリシーを作成",
      description: "ボード、リスト、カードをログインユーザーの所有データだけに制限する。",
      dueDate: "2026-07-05",
      label: "Engineering",
      position: 1,
    },
    {
      id: createId("card"),
      columnId: doingId,
      title: "ドラッグ中の表示を調整",
      description: "カード移動を即時反映し、裏側で並び順を保存する。",
      dueDate: "2026-07-01",
      label: "Design",
      position: 0,
    },
    {
      id: createId("card"),
      columnId: doneId,
      title: "初期ボードを用意",
      description: "新規ユーザーがすぐ試せるデフォルトボードを作成する。",
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
