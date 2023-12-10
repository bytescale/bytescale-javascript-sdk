export class ConsoleUtils {
  static debug(message: string): void {
    console.log(ConsoleUtils.prefix(message));
  }

  static warn(message: string): void {
    console.warn(ConsoleUtils.prefix(message));
  }

  static error(message: string): void {
    console.error(ConsoleUtils.prefix(message));
  }

  private static prefix(message: string): string {
    return `[bytescale-sdk] ${message}`;
  }
}
