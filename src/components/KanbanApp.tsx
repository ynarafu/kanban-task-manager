"use client";

import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  Check,
  GripVertical,
  LogOut,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createId, createStarterWorkspace, labels, nowIso } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Board, Card, CardLabel, Column, UserSession, WorkspaceData } from "@/lib/types";

const emptyWorkspace: WorkspaceData = {
  boards: [],
  columns: [],
  cards: [],
  activeBoardId: null,
};

const labelStyles: Record<CardLabel, string> = {
  Product: "bg-[#37e0bd]/15 text-[#69f0d6] border-[#37e0bd]/40",
  Design: "bg-[#a994ff]/15 text-[#c3b6ff] border-[#a994ff]/40",
  Engineering: "bg-[#f6c65b]/15 text-[#ffd77c] border-[#f6c65b]/40",
  Ops: "bg-[#ff7a59]/15 text-[#ff9a80] border-[#ff7a59]/40",
};

const labelText: Record<CardLabel, string> = {
  Product: "企画",
  Design: "デザイン",
  Engineering: "開発",
  Ops: "運用",
};

function toBoard(row: Record<string, string>): Board {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function toColumn(row: Record<string, string | number>): Column {
  return {
    id: row.id as string,
    boardId: row.board_id as string,
    title: row.title as string,
    position: Number(row.position),
  };
}

function toCard(row: Record<string, string | number>): Card {
  return {
    id: row.id as string,
    columnId: row.list_id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    dueDate: (row.due_date as string) ?? "",
    label: ((row.label as string) || "Product") as CardLabel,
    position: Number(row.position),
  };
}

function localKey(user: UserSession) {
  return `kanban-task-manager:${user.email}`;
}

function reorderCards(
  cards: Card[],
  activeId: string,
  overId: string,
  columns: Column[],
) {
  const activeCard = cards.find((card) => card.id === activeId);
  if (!activeCard) {
    return cards;
  }

  const overCard = cards.find((card) => card.id === overId);
  const overColumn = columns.find((column) => column.id === overId);
  const targetColumnId = overCard?.columnId ?? overColumn?.id;

  if (!targetColumnId) {
    return cards;
  }

  const withoutActive = cards.filter((card) => card.id !== activeId);
  const targetCards = withoutActive
    .filter((card) => card.columnId === targetColumnId)
    .sort((a, b) => a.position - b.position);

  const insertIndex = overCard
    ? Math.max(0, targetCards.findIndex((card) => card.id === overCard.id))
    : targetCards.length;

  targetCards.splice(insertIndex, 0, { ...activeCard, columnId: targetColumnId });

  const affectedColumnIds = new Set([activeCard.columnId, targetColumnId]);
  const normalizedAffected = Array.from(affectedColumnIds).flatMap((columnId) => {
    const source = columnId === targetColumnId
      ? targetCards
      : withoutActive
          .filter((card) => card.columnId === columnId)
          .sort((a, b) => a.position - b.position);

    return source.map((card, position) => ({
      ...card,
      columnId,
      position,
    }));
  });

  return withoutActive
    .filter((card) => !affectedColumnIds.has(card.columnId))
    .concat(normalizedAffected);
}

function useLocalWorkspace(user: UserSession | null) {
  const [data, setData] = useState<WorkspaceData>(emptyWorkspace);

  useEffect(() => {
    if (!user || isSupabaseConfigured) {
      return;
    }

    let nextData = createStarterWorkspace();
    const saved = localStorage.getItem(localKey(user));
    if (saved) {
      try {
        nextData = JSON.parse(saved) as WorkspaceData;
      } catch {
        // 壊れた保存データは破棄し、スターターで復旧する
      }
    }
    setData(nextData);
    localStorage.setItem(localKey(user), JSON.stringify(nextData));
  }, [user]);

  useEffect(() => {
    if (!user || isSupabaseConfigured || !data.activeBoardId) {
      return;
    }
    localStorage.setItem(localKey(user), JSON.stringify(data));
  }, [data, user]);

  return { data, setData };
}

function AuthPanel({
  onSession,
}: {
  onSession: (session: UserSession) => void;
}) {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("demo-password");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (supabase) {
        const result =
          mode === "signin"
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });

        if (result.error) {
          throw result.error;
        }

        const user = result.data.user;
        if (user?.email) {
          onSession({ id: user.id, email: user.email });
        } else {
          setError("メールアドレスを確認してからログインしてください。");
        }
      } else {
        onSession({ id: email.toLowerCase(), email: email.toLowerCase() });
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "認証に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-[440px] rounded-lg border border-[#35362e] bg-[#1a1b17]/95 p-6 shadow-2xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#37e0bd]">
              Kanban Task Manager
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#f7f2e8]">ワークスペースにログイン</h1>
          </div>
          <span className="rounded-md border border-[#37e0bd]/35 px-3 py-1 text-xs font-semibold text-[#69f0d6]">
            {isSupabaseConfigured ? "Supabase" : "デモ"}
          </span>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-[#d8d2c5]">
            メールアドレス
            <input
              className="focus-ring mt-2 w-full rounded-md border border-[#44463b] bg-[#11120f] px-3 py-3 text-[#f7f2e8]"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-[#d8d2c5]">
            パスワード
            <input
              className="focus-ring mt-2 w-full rounded-md border border-[#44463b] bg-[#11120f] px-3 py-3 text-[#f7f2e8]"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-[#ff7a59]/50 bg-[#ff7a59]/10 px-3 py-2 text-sm text-[#ffb09d]">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button
              className="focus-ring rounded-md bg-[#37e0bd] px-4 py-3 font-semibold text-[#07100d]"
              disabled={busy}
              type="submit"
              onClick={() => setMode("signin")}
            >
              ログイン
            </button>
            <button
              className="focus-ring rounded-md border border-[#55574b] px-4 py-3 font-semibold text-[#f7f2e8]"
              disabled={busy}
              type="submit"
              onClick={() => setMode("signup")}
            >
              新規作成
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function BoardSidebar({
  boards,
  activeBoardId,
  onSelect,
  onCreate,
  onDelete,
}: {
  boards: Board[];
  activeBoardId: string | null;
  onSelect: (boardId: string) => void;
  onCreate: (name: string) => void;
  onDelete: (boardId: string) => void;
}) {
  const [name, setName] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    onCreate(trimmed);
    setName("");
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-[#35362e] bg-[#151611]/95 p-4 md:h-screen md:w-[280px] md:border-b-0 md:border-r">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#37e0bd]">ボード</p>
        <h2 className="mt-2 text-2xl font-semibold">Kanban</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {boards.map((board) => {
          const active = board.id === activeBoardId;
          return (
            <button
              className={`focus-ring min-w-[180px] rounded-md border px-3 py-3 text-left text-sm font-semibold transition md:min-w-0 ${
                active
                  ? "border-[#37e0bd]/60 bg-[#37e0bd]/12 text-[#f7f2e8]"
                  : "border-[#35362e] bg-[#1a1b17] text-[#cfc8bb] hover:border-[#55574b]"
              }`}
              key={board.id}
              onClick={() => onSelect(board.id)}
              type="button"
            >
              {board.name}
            </button>
          );
        })}
      </div>

      <form className="mt-auto grid gap-2" onSubmit={submit}>
        <input
          className="focus-ring rounded-md border border-[#44463b] bg-[#11120f] px-3 py-2 text-sm text-[#f7f2e8]"
          placeholder="新しいボード"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-[#37e0bd] px-3 py-2 text-sm font-semibold text-[#07100d]"
          type="submit"
        >
          <Plus size={16} />
          ボード追加
        </button>
        {activeBoardId ? (
          <button
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-[#ff7a59]/40 px-3 py-2 text-sm font-semibold text-[#ff9a80]"
            onClick={() => onDelete(activeBoardId)}
            type="button"
          >
            <Trash2 size={15} />
            ボード削除
          </button>
        ) : null}
      </form>
    </aside>
  );
}

function ColumnTitle({
  column,
  onRename,
  onDelete,
}: {
  column: Column;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);

  useEffect(() => setTitle(column.title), [column.title]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed) {
      onRename(trimmed);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <form className="flex items-center gap-2" onSubmit={submit}>
        <input
          className="focus-ring min-w-0 flex-1 rounded-md border border-[#55574b] bg-[#11120f] px-2 py-1 text-sm"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
        />
        <button className="focus-ring rounded-md bg-[#37e0bd] p-1 text-[#07100d]" type="submit">
          <Check size={16} />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        className="focus-ring min-w-0 truncate text-left text-base font-semibold"
        onClick={() => setEditing(true)}
        type="button"
      >
        {column.title}
      </button>
      <button
        className="focus-ring rounded-md p-1 text-[#b8b1a3] hover:text-[#ff9a80]"
        onClick={onDelete}
        title="カラムを削除"
        type="button"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function SortableCard({
  card,
  onEdit,
}: {
  card: Card;
  onEdit: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      className={`rounded-md border border-[#3d3f36] bg-[#22231d] p-3 shadow-lg transition ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
      ref={setNodeRef}
      style={style}
    >
      <div className="mb-3 flex items-start gap-2">
        <button
          className="focus-ring mt-0.5 rounded p-1 text-[#827c70] hover:text-[#f7f2e8]"
          title="カードを移動"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <button className="focus-ring min-w-0 flex-1 text-left" onClick={() => onEdit(card)} type="button">
          <h4 className="break-words text-sm font-semibold text-[#f7f2e8]">{card.title}</h4>
          {card.description ? (
            <p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-[#b8b1a3]">
              {card.description}
            </p>
          ) : null}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${labelStyles[card.label]}`}>
          {labelText[card.label]}
        </span>
        {card.dueDate ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#b8b1a3]">
            <CalendarDays size={13} />
            {card.dueDate}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function CardPreview({ card }: { card: Card }) {
  return (
    <div className="w-[300px] rounded-md border border-[#37e0bd]/45 bg-[#22231d] p-3 shadow-2xl">
      <h4 className="text-sm font-semibold">{card.title}</h4>
      <p className="mt-2 text-xs text-[#b8b1a3]">{card.description}</p>
    </div>
  );
}

function ColumnLane({
  column,
  cards,
  onAddCard,
  onEditCard,
  onRenameColumn,
  onDeleteColumn,
}: {
  column: Column;
  cards: Card[];
  onAddCard: (columnId: string, title: string) => void;
  onEditCard: (card: Card) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [title, setTitle] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    onAddCard(column.id, trimmed);
    setTitle("");
  }

  return (
    <section
      className={`flex h-[calc(100vh-164px)] min-h-[520px] w-[280px] shrink-0 flex-col rounded-lg border bg-[#1a1b17] transition ${
        isOver ? "border-[#37e0bd]/70" : "border-[#35362e]"
      }`}
      ref={setNodeRef}
    >
      <header className="border-b border-[#35362e] p-3">
        <ColumnTitle
          column={column}
          onDelete={() => onDeleteColumn(column.id)}
          onRename={(nextTitle) => onRenameColumn(column.id, nextTitle)}
        />
        <p className="mt-1 text-xs text-[#8e887b]">{cards.length} 件のカード</p>
      </header>

      <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
          {cards.map((card) => (
            <SortableCard card={card} key={card.id} onEdit={onEditCard} />
          ))}
        </div>
      </SortableContext>

      <form className="border-t border-[#35362e] p-3" onSubmit={submit}>
        <input
          className="focus-ring w-full rounded-md border border-[#44463b] bg-[#11120f] px-3 py-2 text-sm"
          placeholder="新しいカード"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </form>
    </section>
  );
}

function CardDialog({
  card,
  onClose,
  onSave,
  onDelete,
}: {
  card: Card;
  onClose: () => void;
  onSave: (card: Card) => void;
  onDelete: (cardId: string) => void;
}) {
  const [draft, setDraft] = useState(card);

  useEffect(() => setDraft(card), [card]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      return;
    }
    onSave({ ...draft, title: draft.title.trim() });
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 px-4">
      <form
        className="w-full max-w-[560px] rounded-lg border border-[#35362e] bg-[#1a1b17] p-5 shadow-2xl"
        onSubmit={submit}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold">カード</h3>
          <button className="focus-ring rounded-md p-1 text-[#b8b1a3]" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-[#d8d2c5]">
            タイトル
            <input
              className="focus-ring rounded-md border border-[#44463b] bg-[#11120f] px-3 py-2"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[#d8d2c5]">
            説明
            <textarea
              className="focus-ring min-h-[120px] rounded-md border border-[#44463b] bg-[#11120f] px-3 py-2"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[#d8d2c5]">
              期限
              <input
                className="focus-ring rounded-md border border-[#44463b] bg-[#11120f] px-3 py-2"
                type="date"
                value={draft.dueDate}
                onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#d8d2c5]">
              ラベル
              <select
                className="focus-ring rounded-md border border-[#44463b] bg-[#11120f] px-3 py-2"
                value={draft.label}
                onChange={(event) => setDraft({ ...draft, label: event.target.value as CardLabel })}
              >
                {labels.map((label) => (
                  <option key={label} value={label}>
                    {labelText[label]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            className="focus-ring inline-flex items-center gap-2 rounded-md border border-[#ff7a59]/45 px-3 py-2 text-sm font-semibold text-[#ff9a80]"
            onClick={() => onDelete(card.id)}
            type="button"
          >
            <Trash2 size={16} />
            削除
          </button>
          <button className="focus-ring rounded-md bg-[#37e0bd] px-4 py-2 font-semibold text-[#07100d]" type="submit">
            保存
          </button>
        </div>
      </form>
    </div>
  );
}

export function KanbanApp() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState("待機中");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const { data: localData, setData: setLocalData } = useLocalWorkspace(session);
  const [supabaseData, setSupabaseData] = useState<WorkspaceData>(emptyWorkspace);
  const data = isSupabaseConfigured ? supabaseData : localData;
  const setData = isSupabaseConfigured ? setSupabaseData : setLocalData;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    async function boot() {
      if (supabase) {
        const result = await supabase.auth.getUser();
        if (result.data.user?.email) {
          setSession({ id: result.data.user.id, email: result.data.user.email });
        }
      } else {
        const saved = localStorage.getItem("kanban-task-manager:session");
        if (saved) {
          try {
            setSession(JSON.parse(saved) as UserSession);
          } catch {
            localStorage.removeItem("kanban-task-manager:session");
          }
        }
      }
      setLoading(false);
    }

    void boot();
  }, []);

  useEffect(() => {
    if (!session || !supabase) {
      return;
    }

    void loadSupabaseWorkspace(session.id);
  }, [session]);

  useEffect(() => {
    if (!session || supabase) {
      return;
    }
    localStorage.setItem("kanban-task-manager:session", JSON.stringify(session));
  }, [session]);

  const activeBoard = data.boards.find((board) => board.id === data.activeBoardId) ?? data.boards[0];
  const boardColumns = useMemo(
    () =>
      data.columns
        .filter((column) => column.boardId === activeBoard?.id)
        .sort((a, b) => a.position - b.position),
    [activeBoard?.id, data.columns],
  );
  const visibleCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.cards.filter((card) => {
      if (!boardColumns.some((column) => column.id === card.columnId)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return `${card.title} ${card.description} ${card.label}`.toLowerCase().includes(normalizedQuery);
    });
  }, [boardColumns, data.cards, query]);
  const activeCard = data.cards.find((card) => card.id === activeCardId) ?? null;

  async function loadSupabaseWorkspace(userId: string) {
    if (!supabase) {
      return;
    }
    setSyncStatus("読み込み中");
    const [boardsResult, columnsResult, cardsResult] = await Promise.all([
      supabase.from("boards").select("id,name,created_at").eq("user_id", userId).order("created_at"),
      supabase.from("lists").select("id,board_id,title,position").order("position"),
      supabase.from("cards").select("id,list_id,title,description,due_date,label,position").order("position"),
    ]);

    if (boardsResult.error || columnsResult.error || cardsResult.error) {
      setSyncStatus("同期エラー");
      return;
    }

    let nextData: WorkspaceData = {
      boards: (boardsResult.data ?? []).map(toBoard),
      columns: (columnsResult.data ?? []).map(toColumn),
      cards: (cardsResult.data ?? []).map(toCard),
      activeBoardId: boardsResult.data?.[0]?.id ?? null,
    };

    if (nextData.boards.length === 0) {
      nextData = await createRemoteStarterWorkspace(userId);
    }

    setSupabaseData(nextData);
    setSyncStatus("同期済み");
  }

  async function createRemoteStarterWorkspace(userId: string) {
    if (!supabase) {
      return createStarterWorkspace();
    }
    const starter = createStarterWorkspace();
    await supabase.from("boards").insert(
      starter.boards.map((board) => ({
        id: board.id,
        user_id: userId,
        name: board.name,
        created_at: board.createdAt,
      })),
    );
    await supabase.from("lists").insert(
      starter.columns.map((column) => ({
        id: column.id,
        board_id: column.boardId,
        title: column.title,
        position: column.position,
      })),
    );
    await supabase.from("cards").insert(
      starter.cards.map((card) => ({
        id: card.id,
        list_id: card.columnId,
        title: card.title,
        description: card.description,
        due_date: card.dueDate || null,
        label: card.label,
        position: card.position,
      })),
    );
    return starter;
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem("kanban-task-manager:session");
    }
    setSession(null);
    setData(emptyWorkspace);
  }

  function updateWorkspace(nextData: WorkspaceData) {
    setData(nextData);
  }

  async function createBoard(name: string) {
    if (!session) {
      return;
    }
    const boardId = createId("board");
    const columnIds = [createId("list"), createId("list"), createId("list")];
    const board: Board = { id: boardId, name, createdAt: nowIso() };
    const columns: Column[] = ["未着手", "進行中", "完了"].map((title, position) => ({
      id: columnIds[position],
      boardId,
      title,
      position,
    }));

    updateWorkspace({
      boards: [...data.boards, board],
      columns: [...data.columns, ...columns],
      cards: data.cards,
      activeBoardId: boardId,
    });

    if (supabase) {
      setSyncStatus("保存中");
      await supabase.from("boards").insert({ id: board.id, user_id: session.id, name, created_at: board.createdAt });
      await supabase.from("lists").insert(
        columns.map((column) => ({
          id: column.id,
          board_id: column.boardId,
          title: column.title,
          position: column.position,
        })),
      );
      setSyncStatus("同期済み");
    }
  }

  async function deleteBoard(boardId: string) {
    const remainingBoards = data.boards.filter((board) => board.id !== boardId);
    const columnIds = new Set(data.columns.filter((column) => column.boardId === boardId).map((column) => column.id));
    updateWorkspace({
      boards: remainingBoards,
      columns: data.columns.filter((column) => column.boardId !== boardId),
      cards: data.cards.filter((card) => !columnIds.has(card.columnId)),
      activeBoardId: remainingBoards[0]?.id ?? null,
    });

    if (supabase) {
      setSyncStatus("保存中");
      await supabase.from("boards").delete().eq("id", boardId);
      setSyncStatus("同期済み");
    }
  }

  async function createColumn(title: string) {
    if (!activeBoard) {
      return;
    }
    const position = boardColumns.length;
    const column: Column = {
      id: createId("list"),
      boardId: activeBoard.id,
      title,
      position,
    };
    updateWorkspace({ ...data, columns: [...data.columns, column] });

    if (supabase) {
      setSyncStatus("保存中");
      await supabase.from("lists").insert({
        id: column.id,
        board_id: column.boardId,
        title,
        position,
      });
      setSyncStatus("同期済み");
    }
  }

  async function renameColumn(columnId: string, title: string) {
    updateWorkspace({
      ...data,
      columns: data.columns.map((column) => (column.id === columnId ? { ...column, title } : column)),
    });
    if (supabase) {
      setSyncStatus("保存中");
      await supabase.from("lists").update({ title }).eq("id", columnId);
      setSyncStatus("同期済み");
    }
  }

  async function deleteColumn(columnId: string) {
    updateWorkspace({
      ...data,
      columns: data.columns.filter((column) => column.id !== columnId),
      cards: data.cards.filter((card) => card.columnId !== columnId),
    });
    if (supabase) {
      setSyncStatus("保存中");
      await supabase.from("lists").delete().eq("id", columnId);
      setSyncStatus("同期済み");
    }
  }

  async function createCard(columnId: string, title: string) {
    const position = data.cards.filter((card) => card.columnId === columnId).length;
    const card: Card = {
      id: createId("card"),
      columnId,
      title,
      description: "",
      dueDate: "",
      label: "Product",
      position,
    };
    updateWorkspace({ ...data, cards: [...data.cards, card] });

    if (supabase) {
      setSyncStatus("保存中");
      await supabase.from("cards").insert({
        id: card.id,
        list_id: card.columnId,
        title: card.title,
        description: card.description,
        due_date: null,
        label: card.label,
        position,
      });
      setSyncStatus("同期済み");
    }
  }

  async function saveCard(card: Card) {
    updateWorkspace({
      ...data,
      cards: data.cards.map((existing) => (existing.id === card.id ? card : existing)),
    });
    setEditingCard(null);

    if (supabase) {
      setSyncStatus("保存中");
      await supabase
        .from("cards")
        .update({
          title: card.title,
          description: card.description,
          due_date: card.dueDate || null,
          label: card.label,
        })
        .eq("id", card.id);
      setSyncStatus("同期済み");
    }
  }

  async function deleteCard(cardId: string) {
    updateWorkspace({ ...data, cards: data.cards.filter((card) => card.id !== cardId) });
    setEditingCard(null);

    if (supabase) {
      setSyncStatus("保存中");
      await supabase.from("cards").delete().eq("id", cardId);
      setSyncStatus("同期済み");
    }
  }

  function onDragStart(event: DragStartEvent) {
    setActiveCardId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveCardId(null);

    if (!event.over) {
      return;
    }

    const activeId = String(event.active.id);
    const overId = String(event.over.id);
    const nextCards = reorderCards(data.cards, activeId, overId, data.columns);

    // 並び替えで実際に変わったカードだけを抽出（全カード更新を避ける）
    const prev = new Map(data.cards.map((card) => [card.id, card]));
    const changed = nextCards.filter((card) => {
      const before = prev.get(card.id);
      return !before || before.columnId !== card.columnId || before.position !== card.position;
    });

    updateWorkspace({ ...data, cards: nextCards });

    const client = supabase;
    if (client && changed.length > 0) {
      setSyncStatus("保存中");
      await Promise.all(
        changed.map((card) =>
          client
            .from("cards")
            .update({ list_id: card.columnId, position: card.position })
            .eq("id", card.id),
        ),
      );
      setSyncStatus("同期済み");
    }
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center text-[#b8b1a3]">読み込み中</main>;
  }

  if (!session) {
    return <AuthPanel onSession={setSession} />;
  }

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      <BoardSidebar
        activeBoardId={activeBoard?.id ?? null}
        boards={data.boards}
        onCreate={createBoard}
        onDelete={deleteBoard}
        onSelect={(boardId) => updateWorkspace({ ...data, activeBoardId: boardId })}
      />

      <section className="min-w-0 flex-1">
        <header className="flex flex-col gap-4 border-b border-[#35362e] bg-[#11120f]/88 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b8b1a3]">
              {isSupabaseConfigured ? "Supabase ワークスペース" : "デモワークスペース"} · {syncStatus}
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold md:text-3xl">
              {activeBoard?.name ?? "ボードが選択されていません"}
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8e887b]" size={16} />
              <input
                className="focus-ring w-full rounded-md border border-[#44463b] bg-[#1a1b17] py-2 pl-9 pr-3 text-sm"
                placeholder="カードを検索"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-[#55574b] px-3 py-2 text-sm font-semibold text-[#f7f2e8]"
              onClick={signOut}
              type="button"
            >
              <LogOut size={16} />
              ログアウト
            </button>
          </div>
        </header>

        <DndContext
          collisionDetection={closestCorners}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          sensors={sensors}
        >
          <div className="flex gap-4 overflow-x-auto px-4 py-4">
            {boardColumns.map((column) => {
              const columnCards = visibleCards
                .filter((card) => card.columnId === column.id)
                .sort((a, b) => a.position - b.position);

              return (
                <ColumnLane
                  cards={columnCards}
                  column={column}
                  key={column.id}
                  onAddCard={createCard}
                  onDeleteColumn={deleteColumn}
                  onEditCard={setEditingCard}
                  onRenameColumn={renameColumn}
                />
              );
            })}

            <AddColumn onCreate={createColumn} />
          </div>

          <DragOverlay>{activeCard ? <CardPreview card={activeCard} /> : null}</DragOverlay>
        </DndContext>
      </section>

      {editingCard ? (
        <CardDialog
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onDelete={deleteCard}
          onSave={saveCard}
        />
      ) : null}
    </main>
  );
}

function AddColumn({ onCreate }: { onCreate: (title: string) => void }) {
  const [title, setTitle] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form
      className="flex h-[120px] w-[260px] shrink-0 flex-col gap-3 rounded-lg border border-dashed border-[#55574b] bg-[#1a1b17]/70 p-3"
      onSubmit={submit}
    >
      <input
        className="focus-ring rounded-md border border-[#44463b] bg-[#11120f] px-3 py-2 text-sm"
        placeholder="新しいカラム"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button
        className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-[#37e0bd] px-3 py-2 text-sm font-semibold text-[#07100d]"
        type="submit"
      >
        <Plus size={16} />
        カラム追加
      </button>
    </form>
  );
}
