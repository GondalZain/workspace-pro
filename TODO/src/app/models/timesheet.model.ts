export interface TimesheetEntry {
  id: number;
  seqNo: number;
  title: string;
  description: string;
  task: string;
  project: string;
  time: string;
  date?: string;
  createdAt?: string;
}

export type NewTimesheetEntry = Omit<TimesheetEntry, 'id' | 'seqNo'>;
