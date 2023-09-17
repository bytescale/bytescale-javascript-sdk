export class ConsoleUtils {
  static error(message: string): void {
    console.error(ConsoleUtils.prefix(message));
  }

  static warn(message: string): void {
    console.warn(ConsoleUtils.prefix(message));
  }

  private static prefix(message: string): string {
    return `[bytescale-sdk] ${message}`;
  }
}
