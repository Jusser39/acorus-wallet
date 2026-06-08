const fromUsd = 1682.84;
const toUsd = 1;
const rate = fromUsd / toUsd;
const amount = 1;
const simulatedOutput = (amount * rate) * 0.98;
const toDecimals = 18;
const rawOutput = (BigInt(Math.floor(simulatedOutput * 1e6)) * (10n ** BigInt(toDecimals))) / 1000000n;
console.log(rawOutput.toString());
console.log(simulatedOutput);
