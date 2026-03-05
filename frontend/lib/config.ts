import { apiFetch } from "./api";


export interface HealthResponse {
  status: string;
  version: string;
  uptimeSeconds: number;
}

export interface StakingPositionReponse {
  success: boolean;
  position: {
    staked: string;
    claimable: string;
  }
}


export interface TxResponse {
  success: boolean
  outboxId: string
  txId: string
  status: "CONFIRMED" | "QUEUED"
  message: string
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}


export function getStakingPosition(): Promise<StakingPositionReponse> {
  return apiFetch<StakingPositionReponse>("/api/staking/position");
}


export function stakeTokens(amountUsdc: string): Promise<TxResponse> {
  return apiFetch("/api/staking/stake", {
    method: "POST",
    body: JSON.stringify({
      amountUsdc,
      externalRefSource: "web",
      externalRef: crypto.randomUUID()
    })
  })
}

export function unstakeTokens(amountUsdc: string): Promise<TxResponse> {
  return apiFetch("/api/staking/unstake", {
    method: "POST",
    body: JSON.stringify({
      amountUsdc,
      externalRefSource: "web",
      externalRef: crypto.randomUUID()
    })
  })
}

export function claimRewards(): Promise<TxResponse> {
  return apiFetch("/api/staking/claim", {
    method: "POST",
    body: JSON.stringify({
      externalRefSource: "web",
      externalRef: crypto.randomUUID()
    })
  })
}