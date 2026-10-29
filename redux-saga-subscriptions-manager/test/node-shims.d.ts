// Minimal ambient declarations for Node's built-in test runner.
// @types/node is not installed in this workspace, so tests use this shim
// purely for compilation; at runtime the real node:test/node:assert are used.

declare module 'node:test' {
  export interface MockTimers {
    enable(options?: { apis?: string[] }): void;
    tick(milliseconds: number): void;
    reset(): void;
  }

  export interface TestContext {
    mock: { timers: MockTimers };
  }

  export type TestFn = (t: TestContext) => void | Promise<void>;

  export function test(name: string, fn: TestFn): void;
  export function test(
    name: string,
    options: { skip?: string | boolean },
    fn: TestFn,
  ): void;
}

declare module 'node:assert/strict' {
  const assert: {
    ok(value: any, message?: string): void;
    equal(actual: any, expected: any, message?: string): void;
    notEqual(actual: any, expected: any, message?: string): void;
    deepEqual(actual: any, expected: any, message?: string): void;
    notDeepEqual(actual: any, expected: any, message?: string): void;
    fail(message?: string): void;
  };
  export = assert;
}
