export const EVENT_COLORS = ["blue", "green", "red", "purple", "amber", "pink", "gray"] as const;
export type EventColor = (typeof EVENT_COLORS)[number];

export function normalizeColor(value: string | null | undefined): EventColor {
  return (EVENT_COLORS as readonly string[]).includes(value ?? "") ? (value as EventColor) : "blue";
}

export interface PersonalEvent {
  id:         string;
  memberId:   string;
  memberName: string;
  title:      string;
  allDay:     boolean;
  startAt:    string;
  endAt?:     string;
  location?:  string;
  memo?:      string;
  color:      EventColor;
  participantIds: string[];
  updatedById?: string;
  createdAt:  string;
  updatedAt:  string;
}
