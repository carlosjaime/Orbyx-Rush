/**
 * Monetisation contract — deliberately unimplemented in v1.0.0.
 *
 * The whole game is playable for free, there are no ads, no in-app purchases
 * and no placeholder store buttons anywhere in the UI. This file only fixes the
 * shape a future implementation must satisfy so nothing has to be refactored
 * when (and if) commercial features are added.
 */

export type StoreProductKind = 'cosmetic-pack' | 'premium-skin' | 'remove-ads' | 'cosmetic-pass';

export interface StoreProduct {
  id: string;
  kind: StoreProductKind;
  title: string;
  description: string;
  /** Localised, provider-formatted price string. */
  displayPrice: string;
}

export interface PurchaseResult {
  status: 'purchased' | 'restored' | 'cancelled' | 'unavailable';
  productId: string;
}

export interface MonetizationAdapter {
  readonly id: string;
  readonly available: boolean;
  listProducts(): Promise<StoreProduct[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<string[]>;
  /** Rewarded-video hook. Must never gate progression when unavailable. */
  showRewardedAd(): Promise<{ completed: boolean }>;
}

/** The shipped implementation: reports "nothing for sale" for everything. */
export class DisabledMonetizationAdapter implements MonetizationAdapter {
  readonly id = 'disabled';
  readonly available = false;

  async listProducts(): Promise<StoreProduct[]> {
    return [];
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    return { status: 'unavailable', productId };
  }

  async restorePurchases(): Promise<string[]> {
    return [];
  }

  async showRewardedAd(): Promise<{ completed: boolean }> {
    return { completed: false };
  }
}

let adapter: MonetizationAdapter = new DisabledMonetizationAdapter();

export function getMonetizationAdapter(): MonetizationAdapter {
  return adapter;
}

export function setMonetizationAdapter(next: MonetizationAdapter): void {
  adapter = next;
}
