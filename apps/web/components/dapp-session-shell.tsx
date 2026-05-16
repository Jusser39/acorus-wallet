"use client";

import {
  approveDappProposal,
  approveDappRequest,
  DAPP_PERMISSION_DEFINITIONS,
  getDappRequestKindLabel,
  getDappSessionStatusLabel,
  rejectDappProposal,
  rejectDappRequest,
  revokeDappSession,
  type DappShellSnapshot,
} from "@acorus/shared";
import { useMemo, useState } from "react";
import {
  createWebDappShellPreview,
  formatDappPermissionList,
  getDappSessionTone,
  getDappTrustLabel,
  getDappTrustTone,
} from "../lib/dapp-shell";

export function DappSessionShell() {
  const [snapshot, setSnapshot] = useState<DappShellSnapshot>(() =>
    createWebDappShellPreview(),
  );

  const activeSessions = useMemo(
    () => snapshot.sessions.filter((session) => session.status === "active"),
    [snapshot.sessions],
  );

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          dApps
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Universal dApp bridge is live in preview-backed mode
        </h1>
        <p className="text-sm text-slate-300">
          Connected sites, permission prompts, request queue and revoke controls
          now share one multichain dApp contract. Connect, accounts, chainId and
          switchChain can now route through the extension bridge after approval.
          Signing and broadcast still stay disabled in this wave.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Connection proposals"
          value={snapshot.proposals.length}
          tone="border-amber-500/30 bg-amber-500/10 text-amber-100"
        />
        <SummaryCard
          label="Pending requests"
          value={snapshot.pendingRequests.length}
          tone="border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
        />
        <SummaryCard
          label="Active sessions"
          value={activeSessions.length}
          tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
        />
        <SummaryCard
          label="Live bridge methods"
          value={4}
          tone="border-violet-500/30 bg-violet-500/10 text-violet-100"
        />
      </div>

      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
        No website can access keys, mnemonic, passcode, or signing output in
        this wave. The bridge is live only for connection and network metadata
        using preview-backed approved accounts; sign/send flows remain blocked.
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Connection proposals
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Origin-scoped sessions before anything is exposed.
                </p>
              </div>
              <StatusPill label={`${snapshot.proposals.length} queued`} />
            </div>

            <div className="space-y-3">
              {snapshot.proposals.length === 0 ? (
                <EmptyState message="No pending connection proposals in the preview queue." />
              ) : (
                snapshot.proposals.map((proposal) => (
                  <article
                    key={proposal.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-medium text-white">
                          {proposal.origin.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {proposal.origin.origin}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${getDappTrustTone(proposal.origin.trustLevel)}`}
                      >
                        {getDappTrustLabel(proposal.origin.trustLevel)}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                      <div>
                        <dt className="text-slate-400">Accounts</dt>
                        <dd>{proposal.requestedAccounts.join(", ")}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Chains</dt>
                        <dd>{proposal.requestedChainIds.join(", ")}</dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-slate-400">Permissions</dt>
                        <dd>{formatDappPermissionList(proposal.requestedPermissions)}</dd>
                      </div>
                    </dl>

                    {proposal.warning ? (
                      <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                        {proposal.warning}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <ShellButton
                        label="Approve preview"
                        tone="primary"
                        onClick={() =>
                          setSnapshot((current) =>
                            approveDappProposal(current, proposal.id),
                          )
                        }
                      />
                      <ShellButton
                        label="Reject"
                        tone="secondary"
                        onClick={() =>
                          setSnapshot((current) =>
                            rejectDappProposal(current, proposal.id),
                          )
                        }
                      />
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Request queue
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Follow-up prompts stay account-scoped and visible.
                </p>
              </div>
              <StatusPill label={`${snapshot.pendingRequests.length} pending`} />
            </div>

            <div className="space-y-3">
              {snapshot.pendingRequests.length === 0 ? (
                <EmptyState message="No pending request prompts remain in the preview queue." />
              ) : (
                snapshot.pendingRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-medium text-white">
                          {getDappRequestKindLabel(request.kind)}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {request.origin.title} · {request.origin.origin}
                        </p>
                      </div>
                      <StatusPill label={request.chainId ? `Chain ${request.chainId}` : "Multichain"} />
                    </div>

                    <p className="mt-4 text-sm text-slate-300">{request.summary}</p>

                    <dl className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                      <div>
                        <dt className="text-slate-400">Account</dt>
                        <dd>{request.account ?? "No account disclosed"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Permissions</dt>
                        <dd>{formatDappPermissionList(request.requestedPermissions)}</dd>
                      </div>
                    </dl>

                    {request.warning ? (
                      <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                        {request.warning}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <ShellButton
                        label="Approve preview"
                        tone="primary"
                        onClick={() =>
                          setSnapshot((current) =>
                            approveDappRequest(current, request.id),
                          )
                        }
                      />
                      <ShellButton
                        label="Reject"
                        tone="secondary"
                        onClick={() =>
                          setSnapshot((current) =>
                            rejectDappRequest(current, request.id),
                          )
                        }
                      />
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Connected sites
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Revocable sessions under the same universal contract.
                </p>
              </div>
              <StatusPill label={`${snapshot.sessions.length} total`} />
            </div>

            <div className="space-y-3">
              {snapshot.sessions.length === 0 ? (
                <EmptyState message="No connected sites are stored in the preview registry." />
              ) : (
                snapshot.sessions.map((session) => (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-medium text-white">
                          {session.origin.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {session.origin.origin}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${getDappSessionTone(session.status)}`}
                      >
                        {getDappSessionStatusLabel(session.status)}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-slate-300">
                      <div>
                        <dt className="text-slate-400">Permissions</dt>
                        <dd>{formatDappPermissionList(session.permissions)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Chains</dt>
                        <dd>{session.chainIds.join(", ")}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Accounts</dt>
                        <dd>{session.accounts.join(", ")}</dd>
                      </div>
                    </dl>

                    {session.warning ? (
                      <p className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
                        {session.warning}
                      </p>
                    ) : null}

                    {session.status === "active" ? (
                      <div className="mt-4">
                        <ShellButton
                          label="Revoke session"
                          tone="secondary"
                          onClick={() =>
                            setSnapshot((current) =>
                              revokeDappSession(current, session.id),
                            )
                          }
                        />
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
            <h2 className="text-lg font-semibold text-white">Permission model</h2>
            <p className="mt-1 text-sm text-slate-300">
              Adapter families can expose dApp capability later, but the shell
              stays origin-bound, account-scoped and chain-aware from day one.
            </p>

            <div className="mt-4 space-y-3">
              {DAPP_PERMISSION_DEFINITIONS.map((permission) => (
                <article
                  key={permission.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <h3 className="text-sm font-medium text-white">
                    {permission.label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {permission.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
            <h2 className="text-lg font-semibold text-white">Recent decisions</h2>
            <p className="mt-1 text-sm text-slate-300">
              Approval history remains visible so a future extension can mirror
              the same queue without inventing another contract.
            </p>

            <div className="mt-4 space-y-3">
              {snapshot.approvalResults.length === 0 ? (
                <EmptyState message="No approval decisions have been recorded yet." />
              ) : (
                snapshot.approvalResults.slice(0, 6).map((result) => (
                  <article
                    key={result.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">
                        {result.decision === "approved" ? "Approved" : "Rejected"}{" "}
                        {result.targetKind}
                      </p>
                      <StatusPill label={result.targetId} />
                    </div>
                    {result.reason ? (
                      <p className="mt-2 text-sm text-slate-300">{result.reason}</p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard(props: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-3xl border p-5 ${props.tone}`}>
      <p className="text-sm uppercase tracking-[0.18em]">{props.label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{props.value}</p>
    </div>
  );
}

function StatusPill(props: { label: string }) {
  return (
    <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
      {props.label}
    </span>
  );
}

function EmptyState(props: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
      {props.message}
    </div>
  );
}

function ShellButton(props: {
  label: string;
  tone: "primary" | "secondary";
  onClick: () => void;
}) {
  const toneClass =
    props.tone === "primary"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
      : "border-slate-700 bg-slate-950/80 text-slate-200 hover:bg-slate-900";

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${toneClass}`}
    >
      {props.label}
    </button>
  );
}
