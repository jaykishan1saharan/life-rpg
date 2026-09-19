export class NextReminderDto {
  reminderTime: string;
  reminderMode: string;

  minutesLeft: number;
  secondsLeft: number;

  countdownSeconds: number;

  isToday: boolean;

  source: 'CUSTOM' | 'INTERVAL' | 'SMART' | 'HYBRID';
}