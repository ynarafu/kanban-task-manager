export type UserSession = {
  id: string;
  email: string;
};

export type Board = {
  id: string;
  name: string;
  createdAt: string;
};

export type Column = {
  id: string;
  boardId: string;
  title: string;
  position: number;
};

export type CardLabel = "Product" | "Design" | "Engineering" | "Ops";

export type Card = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  dueDate: string;
  label: CardLabel;
  position: number;
};

export type WorkspaceData = {
  boards: Board[];
  columns: Column[];
  cards: Card[];
  activeBoardId: string | null;
};
