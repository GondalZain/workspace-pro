export interface TaskNote {
  id: number;
  taskId: number;
  userId: number;
  username: string;
  email: string;
  profileImagePath?: string | null;
  content: string;
  createdAt: string;
}
