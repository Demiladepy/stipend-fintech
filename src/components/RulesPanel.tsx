'use client';

import { useEffect, useState } from 'react';
import { isAddress, parseUnits, zeroAddress } from 'viem';
import { publicClient } from '@/lib/vault';
import { stipendVaultAbi } from '@/lib/abi';
import { VAULT_ADDRESS } from '@/lib/config';
import { useUniversalAccount } from '@/providers/UAProvider';

type Rules = readonly [bigint, bigint, number, bigint, `0x${string}`, boolean, boolean, number, bigint];
type Pending = { pendingId: bigint; to: string; amount: bigint };

const usdc = (v: string) => (v ? parseUnits(v, 6) : 0n);
const fmt = (v: bigint) => (Number(v) / 1e6).toString();

/** Owner controls from the brief: per-payment cap, expiry, payment count,
 *  approval threshold, guardian, recipient allowlist, pause, approval queue. */
export function RulesPanel({ id, onNotice }: { id: `0x${string}`; onNotice: (m: string) => void }) {
  const { callVault } = useUniversalAccount();
  const [rules, setRules] = useState<Rules | null>(null);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [txCap, setTxCap] = useState('');
  const [expiry, setExpiry] = useState('');
  const [count, setCount] = useState('');
  const [threshold, setThreshold] = useState('');
  const [guardian, setGuardian] = useState('');
  const [allowlistOn, setAllowlistOn] = useState(false);
  const [recipient, setRecipient] = useState('');

  const load = async () => {
    try {
      const r = (await publicClient.readContract({
        address: VAULT_ADDRESS,
        abi: stipendVaultAbi,
        functionName: 'rules',
        args: [id],
      })) as unknown as Rules;
      setRules(r);
      setTxCap(r[0] ? fmt(r[0]) : '');
      setExpiry(r[1] ? new Date(Number(r[1]) * 1000).toISOString().slice(0, 10) : '');
      setCount(r[2] ? String(r[2]) : '');
      setThreshold(r[3] ? fmt(r[3]) : '');
      setGuardian(r[4] !== zeroAddress ? r[4] : '');
      setAllowlistOn(r[6]);

      const logs = await publicClient.getContractEvents({
        address: VAULT_ADDRESS,
        abi: stipendVaultAbi,
        eventName: 'PaymentQueued',
        args: { id },
        fromBlock: BigInt(process.env.NEXT_PUBLIC_VAULT_DEPLOY_BLOCK || '0'),
      });
      const open: Pending[] = [];
      for (const l of logs as any[]) {
        const q = (await publicClient.readContract({
          address: VAULT_ADDRESS,
          abi: stipendVaultAbi,
          functionName: 'pending',
          args: [l.args.pendingId],
        })) as unknown as readonly [string, string, bigint, boolean];
        if (!q[3]) open.push({ pendingId: l.args.pendingId, to: q[1], amount: q[2] });
      }
      setQueue(open);
    } catch {
      // Older vault deployments have no rules(); leave the panel empty.
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (label: string, fn: string, args: readonly unknown[]) => {
    setBusy(true);
    try {
      const tx = await callVault(fn, args);
      onNotice(`${label} on-chain. (tx ${tx.slice(0, 10)}…)`);
      await load();
    } catch (e: any) {
      onNotice(e?.message || `Could not ${label.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  };

  const saveRules = () => {
    if (guardian && !isAddress(guardian)) return onNotice('Guardian must be a wallet address');
    const exp = expiry ? BigInt(Math.floor(new Date(expiry).getTime() / 1000)) : 0n;
    run('Safety rules saved', 'setRules', [
      id,
      usdc(txCap),
      exp,
      Number(count || 0),
      usdc(threshold),
      (guardian || zeroAddress) as `0x${string}`,
      allowlistOn,
    ]);
  };

  const paused = rules?.[5] ?? false;

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-edge/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-[0.16em] text-zinc-500 uppercase">Safety rules</p>
        <button
          className={paused ? 'btn-primary' : 'btn-danger'}
          disabled={busy}
          onClick={() => run(paused ? 'Unpaused' : 'Paused', 'setPaused', [id, !paused])}
        >
          {paused ? 'Unpause' : 'Pause spending'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-500">
          Limit per payment (USDC)
          <input className="input mt-1 w-full" inputMode="decimal" placeholder="off" value={txCap} onChange={(e) => setTxCap(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          Payments per period
          <input className="input mt-1 w-full" inputMode="numeric" placeholder="off" value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          Ask me above (USDC)
          <input className="input mt-1 w-full" inputMode="decimal" placeholder="off" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          Expires on
          <input className="input mt-1 w-full" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500 sm:col-span-2">
          Guardian (can pause, never spend)
          <input className="input mt-1 w-full" placeholder="0x…" value={guardian} onChange={(e) => setGuardian(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-400 sm:col-span-2">
          <input type="checkbox" checked={allowlistOn} onChange={(e) => setAllowlistOn(e.target.checked)} />
          Only pay approved recipients
        </label>
      </div>
      <button className="btn-primary" disabled={busy} onClick={saveRules}>
        {busy ? 'Saving…' : 'Save rules'}
      </button>

      <div className="flex flex-wrap gap-2">
        <input className="input flex-1" placeholder="Approved recipient 0x…" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <button
          className="btn-ghost"
          disabled={busy || !isAddress(recipient)}
          onClick={() => run('Recipient approved', 'setRecipientAllowed', [id, recipient, true])}
        >
          Approve recipient
        </button>
      </div>

      {queue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.16em] text-amber-400 uppercase">Waiting for your approval</p>
          {queue.map((q) => (
            <div key={q.pendingId.toString()} className="flex items-center justify-between text-sm text-zinc-300">
              <span>
                {fmt(q.amount)} USDC → {q.to.slice(0, 8)}…
              </span>
              <button className="btn-primary" disabled={busy} onClick={() => run('Payment approved', 'approvePayment', [q.pendingId])}>
                Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
