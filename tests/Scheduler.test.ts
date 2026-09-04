import { jest } from "@jest/globals";
import { Scheduler } from "../src/private/Scheduler";

class TestEventTarget {
  private readonly listeners = new Map<string, Set<EventListener>>();
  visibilityState: DocumentVisibilityState = "visible";

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

describe("Scheduler", () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let documentEvents: TestEventTarget;
  let windowEvents: TestEventTarget;
  let now: number;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 1000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    documentEvents = new TestEventTarget();
    windowEvents = new TestEventTarget();
    Object.defineProperty(globalThis, "document", { configurable: true, value: documentEvents });
    Object.defineProperty(globalThis, "window", { configurable: true, value: windowEvents });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    restoreGlobal("document", originalDocument);
    restoreGlobal("window", originalWindow);
  });

  test.each(["focus", "online", "pageshow"])("runs overdue callbacks immediately on %s", eventName => {
    const scheduler = new Scheduler();
    const callback = jest.fn();
    scheduler.schedule(2000, callback);

    now = 3000;
    windowEvents.dispatch(eventName);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("runs overdue callbacks when a visible document resumes", () => {
    const scheduler = new Scheduler();
    const callback = jest.fn();
    scheduler.schedule(2000, callback);

    now = 3000;
    documentEvents.visibilityState = "hidden";
    documentEvents.dispatch("visibilitychange");
    expect(callback).not.toHaveBeenCalled();

    documentEvents.visibilityState = "visible";
    documentEvents.dispatch("visibilitychange");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("runs scheduled callbacks immediately after a material backwards clock change", () => {
    const scheduler = new Scheduler();
    const callback = jest.fn();
    now = 10_000;
    scheduler.schedule(20_000, callback);

    now = 8000;
    documentEvents.dispatch("resume");

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("retains normal polling behavior", () => {
    const scheduler = new Scheduler();
    const callback = jest.fn();
    scheduler.schedule(2000, callback);

    now = 1999;
    jest.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();

    now = 2000;
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("does not refresh early for a small clock correction", () => {
    const scheduler = new Scheduler();
    const callback = jest.fn();
    const handle = scheduler.schedule(20_000, callback);

    now = 500;
    windowEvents.dispatch("focus");

    expect(callback).not.toHaveBeenCalled();
    scheduler.unschedule(handle);
  });

  test("removes lifecycle listeners after the final callback is removed", () => {
    const scheduler = new Scheduler();
    const handle = scheduler.schedule(20_000, jest.fn());

    expect(windowEvents.listenerCount("focus")).toBe(1);
    expect(documentEvents.listenerCount("resume")).toBe(1);
    scheduler.unschedule(handle);
    expect(windowEvents.listenerCount("focus")).toBe(0);
    expect(documentEvents.listenerCount("resume")).toBe(0);
  });
});

function restoreGlobal(name: "document" | "window", descriptor: PropertyDescriptor | undefined): void {
  if (descriptor === undefined) {
    Reflect.deleteProperty(globalThis, name);
  } else {
    Object.defineProperty(globalThis, name, descriptor);
  }
}
