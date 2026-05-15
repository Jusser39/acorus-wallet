export class RateLimiter {
  private readonly rpm: number;
  private readonly windowMs: number;
  private requests: number[] = [];

  constructor(rpm: number) {
    this.rpm = rpm;
    this.windowMs = 60000; // 1 minute
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    
    // Remove requests outside the current window
    this.requests = this.requests.filter((timestamp) => now - timestamp < this.windowMs);

    if (this.requests.length >= this.rpm) {
      const oldestRequest = this.requests[0];
      if (oldestRequest !== undefined) {
        const waitTime = this.windowMs - (now - oldestRequest);
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.acquire();
        }
      }
    }

    this.requests.push(now);
  }
}
