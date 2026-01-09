export interface Task {
  category: string;
  description: string;
  passes: boolean;
  steps: string[];
}

export interface ChiefConfig {
  currentWorktree?: string;
}

export interface WorktreeInfo {
  name: string;
  path: string;
  createdAt: Date;
  taskProgress?: {
    completed: number;
    total: number;
  };
}
