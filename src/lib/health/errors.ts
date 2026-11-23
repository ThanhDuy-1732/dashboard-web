export class HealthRunError extends Error {
  readonly checked: number;
  readonly failures: number;

  constructor(checked: number, failures: number) {
    super(`${failures} health target(s) failed to persist`);
    this.name = 'HealthRunError';
    this.checked = checked;
    this.failures = failures;
  }
}
