import { MintCommunicator } from "./communicator";

export { MintCommunicator } from "./communicator";

const comm = new MintCommunicator("https://nofees.testnut.cashu.space", {
  backoffFunction: (r) => 5000 * Math.pow(2, r),
  initialPollingTimeout: { mint: 10000, melt: 10000, proof: 10000 },
});

async function test() {
  const quote = await comm.getMintQuote(21);
  console.log("Quote Created:");
  console.log(quote);
  const sub = comm.pollForMintQuote(quote.quote);
  sub.on("paid", (r) => {
    console.log("Quote Paid:");
    console.log(r);
  });
  sub.on("issued", (r) => {
    console.log("Quote Issued:");
    console.log(r);
  });
  sub.on("polling", () => {
    console.log("Polling for update");
  });
}

test();
