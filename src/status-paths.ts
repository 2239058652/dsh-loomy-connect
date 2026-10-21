/** Node-free constants and types shared by the Host and browser halves. */

/** Plugin-owned status endpoint consumed by its browser half. */
export const LOOMY_STATUS_PATH = '/plugins/dsh-loomy-connect/status'

/** The account's points split the way Loomy's own UI presents it. */
export interface LoomyWebPoints {
  /** Long-lived points — Loomy labels these 永久积分. */
  permanent: number
  /** Points refilled each sign-in day; 每日赠送积分. Resets to 5000 daily. */
  daily: number
  /** ISO timestamp of Loomy's last refresh, so the card can show staleness. */
  updatedAt?: string
}

/** One model as Loomy lists it, including the rate it bills at. */
export interface LoomyWebModel {
  id: string
  /** Loomy's own display name, which carries the rate (e.g. `…（x3.0）`). */
  name: string
  /** Points multiplier Loomy prints in the name — 3 for `x3.0`. */
  rate?: number
  /** Promotional label Loomy prints in the name, e.g. 限时免费. */
  promo?: string
  /** True for image generators: listed for reference, never served to DSH. */
  image?: boolean
  /**
   * Context window in tokens, when Loomy's list carries one. Absent means
   * unknown — e.g. some image generators ship without `context_length` — and
   * the card renders that as `未提供` rather than guessing.
   */
  contextWindow?: number
}

/** The JSON document the plugin card renders. */
export type LoomyWebStatus =
  | { status: 'signed-out' }
  | {
    status: 'signed-in'
    /** Masked sign-in identity (Loomy stores a masked phone number). */
    account?: string
    /** How many models the plugin is currently serving. */
    modelCount: number
    /** Every model the account can reach, including image generators. */
    models?: LoomyWebModel[]
    points?: LoomyWebPoints
    pointsError?: string
  }
  | { status: 'error'; message: string }
