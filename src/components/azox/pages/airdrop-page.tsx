import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, CheckCircle2 } from "lucide-react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useConfig,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
  useDisconnect,
} from "wagmi";
import { simulateContract, waitForTransactionReceipt } from "@wagmi/core";
import { formatEther } from "viem";
import { readStorage, writeStorage } from "@/lib/points";
import {
  AZOX_AIRDROP_ABI,
  AZOX_AIRDROP_ADDRESS,
  REGISTRATION_FEE,
} from "@/lib/contracts";
import { robinhoodTestnet } from "@/lib/wagmi-config";


const KEYS = {
  address: "azox_wallet_address",
  registered: "azox_airdrop_registered",
  date: "azox_airdrop_date",
};

const WalletButton = lazy(() =>
  import("@/lib/appkit-runtime").then((m) => ({ default: m.WalletButton })),
);

function AppKitButton({ balance }: { balance?: "hide" }) {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <WalletButton {...(balance ? { balance } : {})} />
      </Suspense>
    </ClientOnly>
  );
}

const ORANGE = "#FF7A18";
const GREEN = "#a3e635";
const FEE_LABEL = `${formatEther(REGISTRATION_FEE)} ETH`;

function shorten(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const STEPS = [
  { icon: "🔗", text: "Connect your wallet" },
  { icon: "💎", text: `Pay ${FEE_LABEL} registration fee` },
  { icon: "🎁", text: "Receive AZOX tokens at airdrop" },
];

const FAQ = [
  {
    q: "What is the AZOX Airdrop?",
    a: "AZOX token distribution to early community members on Robinhood Chain Testnet.",
  },
  {
    q: "Why is a fee required?",
    a: `The ${FEE_LABEL} fee confirms wallet ownership and prevents bot registrations.`,
  },
  {
    q: "Which network do I need?",
    a: `Robinhood Chain Testnet (Chain ID ${robinhoodTestnet.id}).`,
  },
  {
    q: "How many tokens will I receive?",
    a: "Distribution is based on your points rank and activity on the platform.",
  },
];

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {pieces.map((i) => (
        <span
          key={i}
          className="absolute block size-2 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            top: "-10%",
            background: i % 3 === 0 ? ORANGE : i % 3 === 1 ? GREEN : "#ffffff",
            animation: `azox-confetti 1.6s ${(i % 8) * 0.12}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`@keyframes azox-confetti{to{transform:translateY(320px) rotate(540deg);opacity:0}}`}</style>
    </div>
  );
}

export function AirdropPage() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const wagmiConfig = useConfig();

  const [confetti, setConfetti] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [localRegistered, setLocalRegistered] = useState(false);
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [savedDate, setSavedDate] = useState<string | null>(null);
  useEffect(() => {
    setLocalRegistered(readStorage<boolean>(KEYS.registered, false));
    setSavedAddress(readStorage<string | null>(KEYS.address, null));
    setSavedDate(readStorage<string | null>(KEYS.date, null));
  }, []);

  useEffect(() => {
    const handler = () => {
      console.info("[airdrop] visibilitychange", {
        state: document.visibilityState,
        isConnected,
        address,
        chainId,
        href: window.location.href,
      });
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isConnected, address, chainId]);

  useEffect(() => {
    console.info("[airdrop] account:state", {
      isConnected,
      address,
      chainId,
      timestamp: Date.now(),
    });
  }, [isConnected, address, chainId]);

  const { data: balance } = useBalance({
    address,
    chainId: robinhoodTestnet.id,
    query: { enabled: Boolean(address) },
  });

  const { data: isEligible, refetch: refetchEligible } = useReadContract({
    address: AZOX_AIRDROP_ADDRESS,
    abi: AZOX_AIRDROP_ABI,
    functionName: "isEligible",
    args: address ? [address] : undefined,
    chainId: robinhoodTestnet.id,
    query: { enabled: Boolean(address) },
  });

  const { data: totalRegistered } = useReadContract({
    address: AZOX_AIRDROP_ADDRESS,
    abi: AZOX_AIRDROP_ABI,
    functionName: "totalRegistered",
    chainId: robinhoodTestnet.id,
  });

  const {
    writeContractAsync,
    data: txHash,
    isPending: isTxPending,
    error: txError,
    reset: resetTx,
  } = useWriteContract();

  const [flowError, setFlowError] = useState<string | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed) return;
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    writeStorage(KEYS.registered, true);
    writeStorage(KEYS.address, address ?? "");
    writeStorage(KEYS.date, today);
    setLocalRegistered(true);
    setSavedAddress(address ?? null);
    setSavedDate(today);
    setConfetti(true);
    void refetchEligible();
    const t = setTimeout(() => setConfetti(false), 2200);
    return () => clearTimeout(t);
  }, [isConfirmed, address, refetchEligible]);

  const isWrongNetwork = isConnected && chainId !== robinhoodTestnet.id;
  const hasEnoughBalance = Boolean(balance && balance.value >= REGISTRATION_FEE);
  // On-chain eligibility is the ONLY proof of registration.
  const isRegistered = isEligible === true;
  const busy = isTxPending || isConfirming;

  const handleRegister = async (auto = false) => {
    resetTx();
    setFlowError(null);

    const params = {
      address: AZOX_AIRDROP_ADDRESS,
      abi: AZOX_AIRDROP_ABI,
      functionName: "register",
      value: REGISTRATION_FEE,
      chainId: robinhoodTestnet.id,
    } as const;

    console.info("[airdrop] auto-register-start", {
      auto,
      account: address,
      walletChainId: chainId,
      targetChainId: robinhoodTestnet.id,
      contract: AZOX_AIRDROP_ADDRESS,
      valueWei: REGISTRATION_FEE.toString(),
      balanceWei: balance?.value?.toString(),
      eligible: isEligible,
    });

    if (!hasEnoughBalance) {
      setFlowError(
        `Insufficient balance: ${balance ? formatEther(balance.value) : "0"} ETH available, ${FEE_LABEL} + gas required.`,
      );
      return;
    }

    try {
      // Fail loudly *before* asking the wallet: surfaces revert reasons
      // ("Wrong fee", "Already registered", registration closed…) instead of
      // a silent no-op.
      const sim = await simulateContract(wagmiConfig, {
        ...params,
        account: address,
      });
      console.info("[airdrop] simulation-ok", sim.request);
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      console.error("[airdrop] simulation-failed", {
        name: e?.["name"],
        shortMessage: e?.["shortMessage"],
        message: e?.["message"],
        details: e?.["details"],
        cause: e?.["cause"],
        metaMessages: e?.["metaMessages"],
        code: e?.["code"],
        fullError: String(err),
      });

      setFlowError(String(e?.["shortMessage"] ?? e?.["message"] ?? err));
      return;
    }

    try {
      console.info("[airdrop] requesting-transaction-confirmation");
      const hash = await writeContractAsync(params);
      console.info("[airdrop] transaction-submitted", hash);
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: robinhoodTestnet.id,
      });
      console.info("[airdrop] transaction-confirmed", {
        status: receipt.status,
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
      });
      if (receipt.status !== "success") {
        console.error("[airdrop] transaction-failed", receipt.transactionHash);
        setFlowError(`Transaction reverted (${receipt.transactionHash})`);
        return;
      }
      const verified = await refetchEligible();
      console.info("[airdrop] registration-verified", verified.data);
    } catch (err) {
      const e = err as Record<string, unknown>;
      const raw = err instanceof Error ? err.message : String(err);
      const rejected =
        /user rejected|denied transaction|rejected the request/i.test(raw) ||
        e?.["code"] === 4001;
      if (rejected) {
        console.error("[airdrop] transaction-rejected", err);
        setFlowError("Transaction rejected");
      } else {
        console.error("[airdrop] transaction-failed", err);
        setFlowError(raw);
      }
    }
  };


  // Automatic registration right after a NEW successful wallet connection.
  const autoRegisterAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      console.info("[airdrop] wallet-connected", { address, chainId });
    } else {
      autoRegisterAttemptedRef.current = null;
    }
  }, [isConnected, address, chainId]);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (chainId !== robinhoodTestnet.id) {
      // Wrong chain: switch first, effect re-runs once chainId updates.
      if (!isSwitching) switchChain({ chainId: robinhoodTestnet.id });
      return;
    }
    if (isEligible !== false) return;
    if (!balance || balance.value < REGISTRATION_FEE) return;
    if (busy) return;
    if (autoRegisterAttemptedRef.current === address) return;
    autoRegisterAttemptedRef.current = address;
    void handleRegister(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, chainId, isEligible, balance?.value]);


  // Never reuse a previous wallet's local registration state.
  useEffect(() => {
    if (!address) return;
    if (savedAddress && savedAddress.toLowerCase() !== address.toLowerCase()) {
      writeStorage(KEYS.registered, false);
      writeStorage(KEYS.address, "");
      writeStorage(KEYS.date, "");
      setLocalRegistered(false);
      setSavedAddress(null);
      setSavedDate(null);
    }
  }, [address, savedAddress]);


  const displayAddress = address ?? savedAddress;

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Link
          to="/profile"
          aria-label="Back to profile"
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-secondary/40 text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">AZOX Airdrop</h1>
          <p className="text-xs text-muted-foreground">Register your wallet</p>
        </div>
      </header>

      {/* Hero */}
      <section
        className="rounded-2xl p-6 text-center"
        style={{
          background: "#0d0d0d",
          border: `1px solid ${ORANGE}`,
          boxShadow:
            "0 0 0 1px rgba(255,122,24,0.25), 0 10px 32px rgba(255,122,24,0.2)",
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1 }}>🪂</div>
        <h2 className="mt-3 text-base font-bold" style={{ color: ORANGE }}>
          AZOX Airdrop Registration
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Register once to qualify for AZOX token distribution on Robinhood Chain
          Testnet (Chain ID {robinhoodTestnet.id})
        </p>
        {totalRegistered !== undefined && (
          <p className="mt-2 text-xs font-semibold" style={{ color: GREEN }}>
            {totalRegistered.toString()} registered so far
          </p>
        )}
        <div
          className="mx-auto mt-4 h-0.5 w-20 rounded-full"
          style={{ background: ORANGE }}
        />
      </section>

      {/* How it works */}
      <section className="glass rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-bold">How it works</h2>
        <ul className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <li key={s.text} className="flex items-center gap-3">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                style={{ color: GREEN, borderColor: GREEN }}
              >
                {i + 1}
              </span>
              <span className="text-sm" style={{ color: GREEN }}>
                {s.icon} {s.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Main action card */}
      <section
        className="relative rounded-2xl p-5"
        style={{
          background: "#0d0d0d",
          border: `1px solid ${isRegistered ? GREEN : ORANGE}`,
          boxShadow: isRegistered
            ? "0 8px 24px rgba(163,230,53,0.18)"
            : "0 8px 24px rgba(255,122,24,0.18)",
        }}
      >
        {confetti && <Confetti />}

        {isRegistered && (
          <div className="space-y-2 text-center">
            <div style={{ fontSize: 48, lineHeight: 1 }}>✅</div>
            <h2 className="text-base font-bold" style={{ color: GREEN }}>
              Airdrop Eligible!
            </h2>
            {displayAddress && (
              <p className="text-xs text-muted-foreground">
                Wallet:{" "}
                <code className="text-foreground">{shorten(displayAddress)}</code>
              </p>
            )}
            {savedDate && (
              <p className="text-xs text-muted-foreground">
                Registered on: {savedDate}
              </p>
            )}
            <p className="text-xs" style={{ color: GREEN }}>
              Registration confirmed on Robinhood Chain ✓
            </p>
            <button
              onClick={() => {
                disconnect();
                writeStorage(KEYS.registered, false);
                writeStorage(KEYS.address, "");
                writeStorage(KEYS.date, "");
                setLocalRegistered(false);
                setSavedAddress(null);
                setSavedDate(null);
              }}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px",
                background: "none",
                border: "1px solid #444",
                borderRadius: 10,
                color: "#888",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              🔌 Change Wallet
            </button>
          </div>
        )}

        {!isConnected && !isRegistered && (
          <div className="space-y-3">
            <h2 className="text-base font-bold" style={{ color: ORANGE }}>
              Connect Your Wallet
            </h2>
            <p className="text-xs text-muted-foreground">
              Supports MetaMask, Trust Wallet, Phantom, Coinbase & more
            </p>
            <span
              className="inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              style={{ color: ORANGE, borderColor: ORANGE }}
            >
              Robinhood Chain Testnet
            </span>
            <div className="flex justify-center">
              <AppKitButton />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              One-time registration fee: {FEE_LABEL}
            </p>
          </div>
        )}

        {isConnected && isWrongNetwork && !isRegistered && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: ORANGE }}>
              ⚠️ Wrong network detected
            </h2>
            <p className="text-xs text-muted-foreground">
              Switch to Robinhood Chain Testnet to continue
            </p>
            <button
              onClick={() => switchChain({ chainId: robinhoodTestnet.id })}
              disabled={isSwitching}
              className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: ORANGE }}
            >
              {isSwitching ? "Switching…" : "Switch to Robinhood Testnet"}
            </button>
          </div>
        )}

        {isConnected && !isWrongNetwork && !isRegistered && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="size-4"
                    style={{ color: GREEN }}
                    aria-hidden="true"
                  />
                  <h2 className="text-sm font-bold">Wallet Connected</h2>
                </div>
                <code className="mt-1 block text-xs text-foreground">
                  {address ? shorten(address) : ""}
                </code>
              </div>
              <AppKitButton balance="hide" />
            </div>

            <p className="text-xs text-muted-foreground">
              Balance:{" "}
              <span className="font-semibold text-foreground">
                {balance
                  ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ETH`
                  : "Loading…"}
              </span>
            </p>
            {hasEnoughBalance ? (
              <p className="text-xs font-semibold" style={{ color: GREEN }}>
                ✓ Sufficient balance
              </p>
            ) : (
              <p className="text-xs font-semibold" style={{ color: ORANGE }}>
                ⚠ Insufficient balance
              </p>
            )}

            <button
              onClick={() => disconnect()}
              style={{
                width: "100%",
                padding: "10px",
                background: "none",
                border: "1px solid #444",
                borderRadius: 10,
                color: "#888",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              🔌 Disconnect Wallet
            </button>

            <button
              onClick={() => void handleRegister(false)}
              disabled={!hasEnoughBalance || busy}
              className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:cursor-not-allowed"
              style={{
                background: hasEnoughBalance && !busy ? ORANGE : "#555555",
              }}
            >
              {busy
                ? isConfirming
                  ? "⏳ Confirming on chain…"
                  : "⏳ Confirm in your wallet…"
                : hasEnoughBalance
                  ? `Register Now — ${FEE_LABEL}`
                  : "Insufficient Balance"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              {FEE_LABEL} • One-time fee
            </p>

            {(flowError || txError) && (
              <div className="space-y-1 text-center">
                <p className="text-[11px]" style={{ color: "#ef4444" }}>
                  ❌ {(flowError ?? txError?.message ?? "").slice(0, 200)}
                </p>
                <button
                  onClick={() => {
                    setFlowError(null);
                    resetTx();
                  }}
                  className="text-[11px] underline"
                  style={{ color: ORANGE }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="glass rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-bold">FAQ</h2>
        <ul className="flex flex-col gap-2">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <li
                key={item.q}
                className="rounded-xl border border-border bg-secondary/40"
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold"
                >
                  {item.q}
                  <ChevronDown
                    className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {open && (
                  <p className="px-3 pb-3 text-xs text-muted-foreground">
                    {item.a}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
