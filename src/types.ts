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
  createdAt: Date;
  name: string;
  path: string;
  taskProgress?: {
    completed: number;
    total: number;
  };
}
