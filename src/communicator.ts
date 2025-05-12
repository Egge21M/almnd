import {
  CashuMint,
  CashuWallet,
  MintQuoteResponse,
  MintQuoteState,
  Proof,
} from "@cashu/cashu-ts";
import { Scheduler } from "./scheduler";
import { isQuoteExpired } from "./utils";
import { Logger, MintQuoteActions } from "./type";
import { PollingEventEmitter } from "./emitter";

type PollingTypes = "mint" | "melt" | "proof";

type CommunicatorOptions = {
  backoffFunction?: (numberOfTries: number) => number;
  initialPollingTimeout?: Record<PollingTypes, number>;
  throttleTimeout?: number;
  throttleCapacity?: number;
  logger?: Logger;
};

export class MintCommunicator {
  private wallet: CashuWallet;
  private scheduler: Scheduler;
  private options?: CommunicatorOptions;

  constructor(mintUrl: string, opts?: CommunicatorOptions) {
    this.options = opts;
    this.scheduler = new Scheduler({
      throttleCapacity: this.options?.throttleCapacity,
      throttleTimeout: this.options?.throttleTimeout,
      logger: this.options?.logger,
    });
    this.wallet = new CashuWallet(new CashuMint(mintUrl));
  }

  pollForMintQuote(quote: string | MintQuoteResponse, expiry?: number) {
    const emitter = new PollingEventEmitter<MintQuoteActions>();
    let attempts = 1;
    let lastState: MintQuoteState | "EXPIRED" | null = null;
    let active = true;
    let quoteId = typeof quote === "string" ? quote : quote.quote;
    const timeout = this.options?.initialPollingTimeout?.mint ?? 0;
    const [cancelOldTask, rescheduleTask] = this.scheduler.addTask(async () => {
      if (!active) {
        return;
      }
      try {
        emitter.emit("polling", null);
        const res = await this.wallet.checkMintQuote(quoteId);
        emitter.emit("response", res);
        if (res.state === "PAID" && lastState !== "PAID") {
          lastState = MintQuoteState.PAID;
          emitter.emit("paid", res);
        } else if (res.state === "ISSUED") {
          lastState = MintQuoteState.ISSUED;
          emitter.emit("issued", res);
          return;
        } else if (isQuoteExpired(expiry || res.expiry)) {
          lastState = "EXPIRED";
          emitter.emit("expired", res);
          return;
        }
        if (this.options?.backoffFunction && active) {
          attempts++;
          const delay = this.options.backoffFunction(attempts);
          setTimeout(() => {
            rescheduleTask(delay);
          }, 0);
        }
      } catch (e) {
        if (e instanceof Error) {
          emitter.emit("error", e);
        }
      }
    }, timeout);

    return {
      on: emitter.on.bind(emitter),
      cancel: () => {
        cancelOldTask();
        this.options?.logger?.log("Setting to false!");
        active = false;
      },
    };
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

  async getProofs(amount: number, quote: MintQuoteResponse) {
    const promise = new Promise<Proof[]>((res, rej) => {
      this.scheduler.addPriorityTask(async () => {
        try {
          const proofs = await this.wallet.mintProofs(amount, quote.quote);
          res(proofs);
        } catch (e) {
          rej(e);
        }
      });
    });
    return promise;
  }
}
