import { CashuMint, CashuWallet, MintQuoteResponse } from "@cashu/cashu-ts";
import { Scheduler } from "./scheduler";
import { isQuoteExpired } from "./utils";

type PollingTypes = "mint" | "melt" | "proof";

type CommunicatorOptions = {
  backoffFunction?: (numberOfTries: number) => number;
  initialPollingTimeout?: Record<PollingTypes, number>;
};

export class MintCommunicator {
  private wallet: CashuWallet;
  private scheduler: Scheduler = new Scheduler();
  private options?: CommunicatorOptions;

  constructor(mintUrl: string, opts?: CommunicatorOptions) {
    this.wallet = new CashuWallet(new CashuMint(mintUrl));
    this.options = opts;
  }

  pollForMintQuote(
    quoteId: string,
    callbacks: {
      onPaid: (s: MintQuoteResponse) => void;
      onIssued: (s: MintQuoteResponse) => void;
      onError?: (e: Error) => void;
      onExpired?: (s: MintQuoteResponse) => void;
    },
  ) {
    let attempts = 1;
    const timeout = this.options?.initialPollingTimeout?.mint ?? 0;
    const [cancelTask, rescheduleTask] = this.scheduler.addTask(async () => {
      try {
        const res = await this.wallet.checkMintQuote(quoteId);
        if (res.state === "PAID") {
          callbacks.onPaid(res);
        }
        if (res.state === "ISSUED") {
          callbacks.onIssued(res);
          return;
        }
        if (isQuoteExpired(res)) {
          callbacks.onExpired?.(res);
          return;
        }
        if (this.options?.backoffFunction) {
          rescheduleTask(this.options.backoffFunction(attempts));
        }
      } catch (e) {
        if (e instanceof Error) {
          callbacks.onError?.(e);
        }
      }
    }, timeout);

    return cancelTask;
  }

  async getMintQuote(amount: number) {
    const promise = new Promise<MintQuoteResponse>((res, rej) => {
      this.scheduler.addPriorityTask(async () => {
        try {
          const quoteRes = await this.wallet.createMintQuote(amount);
          res(quoteRes);
        } catch (e) {
          rej(e);
        }
      });
    });
    return promise;
  }
}
