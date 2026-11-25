import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';
export const ENTITLEMENT_ID = 'retrodeck_os_pro';
const DEBUG_REVOKED_STORAGE_KEY = '@retrodeck8_debug_pro_revoked_v1';
/** Set to `false` before App Store / Play Store release to enforce real IAP gating */
export const UNLOCK_ALL_PRO_FOR_BUILD = true;

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
  private debugRevoked = false;
  private listeners: ((status: SubscriptionStatus) => void)[] = [];
  private currentStatus: SubscriptionStatus = {
    isPro: UNLOCK_ALL_PRO_FOR_BUILD,
    activeSubscriptions: UNLOCK_ALL_PRO_FOR_BUILD ? ['retrodeck_pro_build_unlock'] : [],
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
      // Load persisted debug revoke flag only when not forced-unlocked for build testing
      if (!UNLOCK_ALL_PRO_FOR_BUILD) {
        const savedRevoked = await AsyncStorage.getItem(DEBUG_REVOKED_STORAGE_KEY);
        if (savedRevoked === '1') {
          this.debugRevoked = true;
          this.currentStatus = {
            isPro: false,
            activeSubscriptions: [],
            expirationDate: null,
            customerInfo: null,
          };
          this.listeners.forEach((listener) => listener(this.currentStatus));
        }
      }

      // Don't crash on web, unsupported simulators, or Release builds using a Test Store key (`test_...`)
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      const isTestKey = REVENUECAT_API_KEY.startsWith('test_');
      if (
        (Platform.OS !== 'ios' && Platform.OS !== 'android') ||
        (isTestKey && !isDev) ||
        UNLOCK_ALL_PRO_FOR_BUILD
      ) {
        console.log('[RevenueCat] Skipping native SDK configure (mock/build-unlock/test-key release guard).');
        return;
      }

      Purchases.setLogLevel(isDev ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
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
    const rawPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID] || UNLOCK_ALL_PRO_FOR_BUILD;
    const isPro = this.debugRevoked ? false : rawPro;
    const activeSubscriptions = this.debugRevoked
      ? []
      : customerInfo.activeSubscriptions?.length
      ? customerInfo.activeSubscriptions
      : UNLOCK_ALL_PRO_FOR_BUILD
      ? ['retrodeck_pro_build_unlock']
      : [];
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    const expirationDate = this.debugRevoked ? null : (entitlement?.expirationDate || null);

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
    if (!this.isConfigured) return UNLOCK_ALL_PRO_FOR_BUILD && !this.debugRevoked;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      this.updateCustomerInfo(customerInfo);
      return this.currentStatus.isPro;
    } catch (error) {
      console.warn('[RevenueCat] Error checking entitlement:', error);
      return UNLOCK_ALL_PRO_FOR_BUILD && !this.debugRevoked;
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
    this.debugRevoked = true;
    AsyncStorage.setItem(DEBUG_REVOKED_STORAGE_KEY, '1').catch(() => {});
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
    if (!this.isConfigured) {
      if (UNLOCK_ALL_PRO_FOR_BUILD) {
        this.debugRevoked = false;
        this.currentStatus = {
          isPro: true,
          activeSubscriptions: ['retrodeck_pro_build_unlock'],
          expirationDate: null,
          customerInfo: this.currentStatus.customerInfo,
        };
        this.listeners.forEach((listener) => listener(this.currentStatus));
        return { success: true, isPro: true };
      }
      return { success: false, isPro: false };
    }
    const pkgInfo = this.cachedPackages.find((p) => p.type === type);
    if (pkgInfo?.rcPackage) {
      return this.purchasePackage(pkgInfo.rcPackage);
    }
    // If running in development/simulator or RC package not returned yet, try paywall
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
    this.debugRevoked = false;
    AsyncStorage.removeItem(DEBUG_REVOKED_STORAGE_KEY).catch(() => {});
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
    this.debugRevoked = false;
    AsyncStorage.removeItem(DEBUG_REVOKED_STORAGE_KEY).catch(() => {});
    if (!this.isConfigured) {
      if (UNLOCK_ALL_PRO_FOR_BUILD) {
        this.currentStatus = {
          isPro: true,
          activeSubscriptions: ['retrodeck_pro_build_unlock'],
          expirationDate: null,
          customerInfo: this.currentStatus.customerInfo,
        };
        this.listeners.forEach((listener) => listener(this.currentStatus));
      }
      return this.currentStatus;
    }
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
    if (!this.isConfigured || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
      console.log('[RevenueCat] Paywall skipped (SDK not configured on this build/platform)');
      return UNLOCK_ALL_PRO_FOR_BUILD && !this.debugRevoked;
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
    if (!this.isConfigured || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
      return UNLOCK_ALL_PRO_FOR_BUILD && !this.debugRevoked;
    }

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
