import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export const REVENUECAT_API_KEY = 'test_sIXFfTgPfDmQXGqlTkwVLEBbVWJ';
export const ENTITLEMENT_ID = 'retrodeck_os_pro';

export interface SubscriptionStatus {
  isPro: boolean;
  activeSubscriptions: string[];
  expirationDate: string | null;
  customerInfo: CustomerInfo | null;
}

class RevenueCatService {
  private isConfigured = false;
  private listeners: ((status: SubscriptionStatus) => void)[] = [];
  private currentStatus: SubscriptionStatus = {
    isPro: false,
    activeSubscriptions: [],
    expirationDate: null,
    customerInfo: null,
  };

  /**
   * Initializes RevenueCat SDK with API key and configures listener
   */
  public async initialize(): Promise<void> {
    if (this.isConfigured) return;

    try {
      // Don't crash on web or unsupported simulators without billing
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        console.log('[RevenueCat] Platform is not iOS or Android, running in mock mode.');
        return;
      }

      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      this.isConfigured = true;

      // Listen for customer info updates (subscription renewals, cancellations, etc.)
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        this.updateCustomerInfo(customerInfo);
      });

      // Fetch initial state
      const initialInfo = await Purchases.getCustomerInfo();
      this.updateCustomerInfo(initialInfo);
    } catch (error) {
      console.warn('[RevenueCat] Initialization error:', error);
    }
  }

  /**
   * Updates internal state and notifies subscribers
   */
  private updateCustomerInfo(customerInfo: CustomerInfo): void {
    const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    const activeSubscriptions = customerInfo.activeSubscriptions || [];
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    const expirationDate = entitlement?.expirationDate || null;

    this.currentStatus = {
      isPro,
      activeSubscriptions,
      expirationDate,
      customerInfo,
    };

    this.listeners.forEach((listener) => listener(this.currentStatus));
  }

  /**
   * Check if user has active Pro entitlement
   */
  public async checkProEntitlement(): Promise<boolean> {
    if (!this.isConfigured) return false;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      this.updateCustomerInfo(customerInfo);
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (error) {
      console.warn('[RevenueCat] Error checking entitlement:', error);
      return false;
    }
  }

  /**
   * Get current subscription status
   */
  public getStatus(): SubscriptionStatus {
    return this.currentStatus;
  }

  /**
   * Subscribe to customer info changes
   */
  public subscribe(listener: (status: SubscriptionStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Fetch current offerings (Monthly, Yearly, Lifetime packages)
   */
  public async getOfferings(): Promise<PurchasesOffering | null> {
    if (!this.isConfigured) return null;
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        return offerings.current;
      }
      return null;
    } catch (error) {
      console.warn('[RevenueCat] Error fetching offerings:', error);
      return null;
    }
  }

  /**
   * Purchase a specific package manually (if not using Paywall UI)
   */
  public async purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; isPro: boolean; userCancelled?: boolean }> {
    if (!this.isConfigured) return { success: false, isPro: false };
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      this.updateCustomerInfo(customerInfo);
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      return { success: true, isPro };
    } catch (error: any) {
      if (error.userCancelled) {
        return { success: false, isPro: false, userCancelled: true };
      }
      console.warn('[RevenueCat] Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  public async restorePurchases(): Promise<SubscriptionStatus> {
    if (!this.isConfigured) return this.currentStatus;
    try {
      const customerInfo = await Purchases.restorePurchases();
      this.updateCustomerInfo(customerInfo);
      return this.currentStatus;
    } catch (error) {
      console.warn('[RevenueCat] Restore failed:', error);
      throw error;
    }
  }

  /**
   * Presents the RevenueCat Native Paywall modal
   * Returns true if user purchased or restored Pro, false otherwise
   */
  public async presentPaywall(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('[RevenueCat] Paywall not supported on this platform');
      return false;
    }

    try {
      const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();
      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          await this.checkProEntitlement();
          return true;
        case PAYWALL_RESULT.CANCELLED:
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        default:
          return false;
      }
    } catch (error) {
      console.warn('[RevenueCat] Error presenting paywall:', error);
      return false;
    }
  }

  /**
   * Presents the RevenueCat Paywall only if the user does NOT have the entitlement
   */
  public async presentPaywallIfNeeded(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;

    try {
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      if (
        paywallResult === PAYWALL_RESULT.PURCHASED ||
        paywallResult === PAYWALL_RESULT.RESTORED
      ) {
        await this.checkProEntitlement();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('[RevenueCat] Error presenting paywall if needed:', error);
      return false;
    }
  }

  /**
   * Always present Paywall (or restore) on demand
   */
  public async presentCustomerCenter(): Promise<void> {
    await this.presentPaywall();
  }
}

export const revenueCatService = new RevenueCatService();
