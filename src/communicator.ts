import { CashuMint, CashuWallet, MintQuoteResponse } from "@cashu/cashu-ts";
import { Scheduler } from "./scheduler";
import { isQuoteExpired } from "./utils";
import { MintQuoteActions } from "./type";
import { PollingEventEmitter } from "./emitter";

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

  pollForMintQuote(quoteId: string) {
    const emitter = new PollingEventEmitter<MintQuoteActions>();
    let attempts = 1;
    const timeout = this.options?.initialPollingTimeout?.mint ?? 0;
    const [cancelTask, rescheduleTask] = this.scheduler.addTask(async () => {
      try {
        emitter.emit("polling", null);
        const res = await this.wallet.checkMintQuote(quoteId);
        if (res.state === "PAID") {
          emitter.emit("paid", res);
        }
        if (res.state === "ISSUED") {
          emitter.emit("issued", res);
        }
        if (isQuoteExpired(res)) {
          emitter.emit("expired", res);
        }
        if (this.options?.backoffFunction) {
          rescheduleTask(this.options.backoffFunction(attempts));
        }
      } catch (e) {
        if (e instanceof Error) {
          emitter.emit("error", e);
        }
      }
    }, timeout);

    return { on: emitter.on.bind(emitter), cancel: cancelTask };
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
