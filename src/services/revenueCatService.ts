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

export type ProPackageType = 'monthly' | 'yearly' | 'lifetime';

export interface ProPackageInfo {
  type: ProPackageType;
  title: string;
  priceString: string;
  badge?: string;
  description: string;
  rcPackage: PurchasesPackage | null;
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

  private cachedPackages: ProPackageInfo[] = [
    {
      type: 'monthly',
      title: 'MONTHLY ACCESS',
      priceString: '$2.99 / MO',
      badge: 'FLEXIBLE',
      description: 'Auto-renewing monthly subscription',
      rcPackage: null,
    },
    {
      type: 'yearly',
      title: 'YEARLY PASS',
      priceString: '$19.99 / YR',
      badge: 'SAVE 45%',
      description: 'Full year of RetroDeck Pro access',
      rcPackage: null,
    },
    {
      type: 'lifetime',
      title: 'LIFETIME VIP',
      priceString: '$49.99',
      badge: 'BEST VALUE',
      description: 'One-time payment for forever Pro access',
      rcPackage: null,
    },
  ];

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
   * DEBUG / DEV: Reset / Revoke Pro purchases cleanly without triggering anonymous logOut errors
   */
  public async resetProDebug(): Promise<SubscriptionStatus> {
    try {
      if (this.isConfigured && Purchases.isAnonymous && Purchases.logOut) {
        const isAnon = await Purchases.isAnonymous();
        if (!isAnon) {
          const customerInfo = await Purchases.logOut();
          this.updateCustomerInfo(customerInfo);
          return this.currentStatus;
        }
      }
    } catch {
      // Ignore SDK warning if not logged in with identified appUserID
    }

    // Force local Pro state reset for testing
    this.currentStatus = {
      isPro: false,
      activeSubscriptions: [],
      expirationDate: null,
      customerInfo: this.currentStatus.customerInfo,
    };
    this.listeners.forEach((listener) => listener(this.currentStatus));
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
   * Fetch current offerings and update package metadata (Monthly, Yearly, Lifetime)
   */
  public async getPackages(): Promise<ProPackageInfo[]> {
    if (!this.isConfigured) return this.cachedPackages;
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        const pkgs = offerings.current.availablePackages;
        const monthly = pkgs.find(
          (p) => p.packageType === 'MONTHLY' || p.identifier.toLowerCase().includes('monthly')
        );
        const yearly = pkgs.find(
          (p) => p.packageType === 'ANNUAL' || p.identifier.toLowerCase().includes('annual') || p.identifier.toLowerCase().includes('yearly')
        );
        const lifetime = pkgs.find(
          (p) => p.packageType === 'LIFETIME' || p.identifier.toLowerCase().includes('lifetime')
        );

        this.cachedPackages = [
          {
            type: 'monthly',
            title: 'MONTHLY ACCESS',
            priceString: monthly?.product?.priceString ? `${monthly.product.priceString} / MO` : '$2.99 / MO',
            badge: 'FLEXIBLE',
            description: monthly?.product?.description || 'Auto-renewing monthly subscription',
            rcPackage: monthly || null,
          },
          {
            type: 'yearly',
            title: 'YEARLY PASS',
            priceString: yearly?.product?.priceString ? `${yearly.product.priceString} / YR` : '$19.99 / YR',
            badge: 'SAVE 45%',
            description: yearly?.product?.description || 'Full year of RetroDeck Pro access',
            rcPackage: yearly || null,
          },
          {
            type: 'lifetime',
            title: 'LIFETIME VIP',
            priceString: lifetime?.product?.priceString || '$49.99',
            badge: 'BEST VALUE',
            description: lifetime?.product?.description || 'One-time payment for forever Pro access',
            rcPackage: lifetime || null,
          },
        ];
      }
    } catch (e) {
      console.warn('[RevenueCat] Could not fetch live packages, using defaults:', e);
    }
    return this.cachedPackages;
  }

  public getCachedPackages(): ProPackageInfo[] {
    return this.cachedPackages;
  }

  /**
   * Purchase package by package type ('monthly' | 'yearly' | 'lifetime')
   */
  public async purchasePackageByType(type: ProPackageType): Promise<{ success: boolean; isPro: boolean; userCancelled?: boolean }> {
    const pkgInfo = this.cachedPackages.find((p) => p.type === type);
    if (pkgInfo?.rcPackage) {
      return this.purchasePackage(pkgInfo.rcPackage);
    }
    // If running in development/simulator or RC package not returned yet, try paywall or simulate
    return this.presentPaywall().then((isPro) => ({ success: isPro, isPro }));
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
