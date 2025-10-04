import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type TxInfo = { hash?: `0x${string}`; at?: number };
type TokenMeta = { symbol: string; decimals: number };

type DelegationSummary = {
    scopeType: 'erc20TransferAmount';
    token: `0x${string}`;
    to: `0x${string}`; // delegate (merchant)
    maxAmount: string; // stringified (e.g. "6000000" for 6 * 1e6)
    signature: `0x${string}`;
};

// New types for advanced features
type SubscriptionData = {
    id: string;
    name: string;
    merchant: `0x${string}`;
    amount: string;
    interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
    isActive: boolean;
    createdAt: number;
    usageCount: number;
};

type PaymentCardData = {
    id: string;
    merchant: `0x${string}`;
    amount: string;
    validForMinutes: number;
    isUsed: boolean;
    expiresAt: number;
    createdAt: number;
};

type SharedPotData = {
    id: string;
    name: string;
    members: `0x${string}`[];
    threshold: number;
    smartAccountAddress: `0x${string}`;
    balance: string;
    isActive: boolean;
    createdAt: number;
};

type DigitalWillData = {
    id: string;
    name: string;
    beneficiaries: { address: `0x${string}`; percentage: number }[];
    inactivityPeriod: number;
    executors: `0x${string}`[];
    isActive: boolean;
    createdAt: number;
    lastActivity: number;
};

type ScheduledPaymentData = {
    id: string;
    name: string;
    recipient: `0x${string}`;
    amount: string;
    schedule: {
        type: 'daily' | 'weekly' | 'monthly' | 'yearly';
        dayOfMonth?: number;
        dayOfWeek?: number;
    };
    nextExecution: number;
    executionsCount: number;
    isActive: boolean;
};

type VirtualCardData = {
    id: string;
    merchant: string;
    merchantAddress: `0x${string}`;
    amount: string;
    remainingAmount: string;
    duration: number;
    maxUses: number;
    usedCount: number;
    createdAt: Date;
    expiresAt: Date;
    status: 'active' | 'expired' | 'used_up' | 'revoked';
    delegationHash?: string;
};


type AppState = {
    // identities
    eoa?: `0x${string}`;
    sa?: `0x${string}`;

    // network (new)
    chainId?: number; // not persisted
    onMonad?: boolean; // persisted (lightweight boolean)

    // balances (not persisted)
    eoaMon?: bigint;
    saMon?: bigint;

    // meta / flags (persisted)
    tokenMeta?: TokenMeta;
    hasFauceted?: boolean;
    lastPay?: TxInfo;
    lastPing?: TxInfo;
    lastFund?: TxInfo;

    // 👇 new (persisted)
    lastDelegation?: DelegationSummary;

    // Advanced features data (persisted)
    subscriptions: SubscriptionData[];
    paymentCards: PaymentCardData[];
    sharedPots: SharedPotData[];
    digitalWills: DigitalWillData[];
    scheduledPayments: ScheduledPaymentData[];
    virtualCards: VirtualCardData[];

    // forms (persisted)
    merchant?: `0x${string}`;
    amount: string;
    fundAmt: string;

    // setters
    setEOA(eoa?: `0x${string}`): void;
    setSA(sa?: `0x${string}`): void;

    // network setters (new)
    setChainId(id?: number): void;
    setOnMonad(v?: boolean): void;

    setEOAMon(v?: bigint): void;
    setSAMon(v?: bigint): void;
    setTokenMeta(m?: TokenMeta): void;
    setHasFauceted(v: boolean): void;
    setLastPay(tx?: TxInfo): void;
    setLastPing(tx?: TxInfo): void;
    setLastFund(tx?: TxInfo): void;
    setLastDelegation(d?: DelegationSummary): void; // 👈 new
    setMerchant(v?: `0x${string}`): void;
    setAmount(v: string): void;
    setFundAmt(v: string): void;

    // Advanced features setters
    addSubscription(subscription: SubscriptionData): void;
    updateSubscription(id: string, updates: Partial<SubscriptionData>): void;
    removeSubscription(id: string): void;
    addPaymentCard(paymentCard: PaymentCardData): void;
    updatePaymentCard(id: string, updates: Partial<PaymentCardData>): void;
    removePaymentCard(id: string): void;
    addSharedPot(sharedPot: SharedPotData): void;
    updateSharedPot(id: string, updates: Partial<SharedPotData>): void;
    removeSharedPot(id: string): void;
    addDigitalWill(digitalWill: DigitalWillData): void;
    updateDigitalWill(id: string, updates: Partial<DigitalWillData>): void;
    removeDigitalWill(id: string): void;
    addScheduledPayment(scheduledPayment: ScheduledPaymentData): void;
    updateScheduledPayment(id: string, updates: Partial<ScheduledPaymentData>): void;
    removeScheduledPayment(id: string): void;


    reset(): void;
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            amount: '6',
            fundAmt: '0.02',
            
            // Initialize advanced features arrays
            subscriptions: [],
            paymentCards: [],
            sharedPots: [],
            digitalWills: [],
            scheduledPayments: [],
            virtualCards: [],

            setEOA: (eoa) => set({ eoa }),
            setSA: (sa) => set({ sa }),

            // network setters
            setChainId: (chainId) =>
                set({ chainId, onMonad: chainId === 10143 }),
            setOnMonad: (onMonad) => set({ onMonad }),

            setEOAMon: (eoaMon) => set({ eoaMon }),
            setSAMon: (saMon) => set({ saMon }),
            setTokenMeta: (tokenMeta) => set({ tokenMeta }),
            setHasFauceted: (hasFauceted) => set({ hasFauceted }),
            setLastPay: (lastPay) => set({ lastPay }),
            setLastPing: (lastPing) => set({ lastPing }),
            setLastFund: (lastFund) => set({ lastFund }),
            setLastDelegation: (lastDelegation) => set({ lastDelegation }), // 👈
            setMerchant: (merchant) => set({ merchant }),
            setAmount: (amount) => set({ amount }),
            setFundAmt: (fundAmt) => set({ fundAmt }),

            // Advanced features setters
            addSubscription: (subscription) =>
                set((state) => ({
                    subscriptions: [...state.subscriptions, subscription],
                })),
            updateSubscription: (id, updates) =>
                set((state) => ({
                    subscriptions: state.subscriptions.map((sub) =>
                        sub.id === id ? { ...sub, ...updates } : sub
                    ),
                })),
            removeSubscription: (id) =>
                set((state) => ({
                    subscriptions: state.subscriptions.filter((sub) => sub.id !== id),
                })),

            addPaymentCard: (paymentCard) =>
                set((state) => ({
                    paymentCards: [...state.paymentCards, paymentCard],
                })),
            updatePaymentCard: (id, updates) =>
                set((state) => ({
                    paymentCards: state.paymentCards.map((card) =>
                        card.id === id ? { ...card, ...updates } : card
                    ),
                })),
            removePaymentCard: (id) =>
                set((state) => ({
                    paymentCards: state.paymentCards.filter((card) => card.id !== id),
                })),

            addSharedPot: (sharedPot) =>
                set((state) => ({
                    sharedPots: [...state.sharedPots, sharedPot],
                })),
            updateSharedPot: (id, updates) =>
                set((state) => ({
                    sharedPots: state.sharedPots.map((pot) =>
                        pot.id === id ? { ...pot, ...updates } : pot
                    ),
                })),
            removeSharedPot: (id) =>
                set((state) => ({
                    sharedPots: state.sharedPots.filter((pot) => pot.id !== id),
                })),

            addDigitalWill: (digitalWill) =>
                set((state) => ({
                    digitalWills: [...state.digitalWills, digitalWill],
                })),
            updateDigitalWill: (id, updates) =>
                set((state) => ({
                    digitalWills: state.digitalWills.map((will) =>
                        will.id === id ? { ...will, ...updates } : will
                    ),
                })),
            removeDigitalWill: (id) =>
                set((state) => ({
                    digitalWills: state.digitalWills.filter((will) => will.id !== id),
                })),

            addScheduledPayment: (scheduledPayment) =>
                set((state) => ({
                    scheduledPayments: [...state.scheduledPayments, scheduledPayment],
                })),
            updateScheduledPayment: (id, updates) =>
                set((state) => ({
                    scheduledPayments: state.scheduledPayments.map((payment) =>
                        payment.id === id ? { ...payment, ...updates } : payment
                    ),
                })),
            removeScheduledPayment: (id) =>
                set((state) => ({
                    scheduledPayments: state.scheduledPayments.filter((payment) => payment.id !== id),
                })),

            // Virtual Cards
            addVirtualCard: (virtualCard: VirtualCardData) =>
                set((state) => ({
                    virtualCards: [...state.virtualCards, virtualCard],
                })),
            updateVirtualCard: (id: string, updates: Partial<VirtualCardData>) =>
                set((state) => ({
                    virtualCards: state.virtualCards.map((card) =>
                        card.id === id ? { ...card, ...updates } : card
                    ),
                })),
            removeVirtualCard: (id: string) =>
                set((state) => ({
                    virtualCards: state.virtualCards.filter((card) => card.id !== id),
                })),


            reset: () =>
                set({
                    eoa: undefined,
                    sa: undefined,

                    chainId: undefined,
                    onMonad: undefined,

                    eoaMon: undefined,
                    saMon: undefined,
                    tokenMeta: undefined,
                    hasFauceted: undefined,
                    lastPay: undefined,
                    lastPing: undefined,
                    lastFund: undefined,
                    lastDelegation: undefined, // 👈
                    merchant: undefined,
                    amount: '6',
                    fundAmt: '0.02',
                    
                    // Reset advanced features
                    subscriptions: [],
                    paymentCards: [],
                    sharedPots: [],
                    digitalWills: [],
                    scheduledPayments: [],
                    virtualCards: [],
                }),
        }),
        {
            name: 'monadblitz-store',
            storage: createJSONStorage(() => localStorage),
            // Don't persist BIGINTs:
            partialize: (s) => ({
                eoa: s.eoa,
                sa: s.sa,
                // network: persist only lightweight flag
                onMonad: s.onMonad,

                tokenMeta: s.tokenMeta,
                hasFauceted: s.hasFauceted,
                lastPay: s.lastPay,
                lastPing: s.lastPing,
                lastFund: s.lastFund,
                lastDelegation: s.lastDelegation, // 👈 persisted
                merchant: s.merchant,
                amount: s.amount,
                fundAmt: s.fundAmt,
                
                // Persist advanced features
                subscriptions: s.subscriptions,
                paymentCards: s.paymentCards,
                sharedPots: s.sharedPots,
                digitalWills: s.digitalWills,
                scheduledPayments: s.scheduledPayments,
                virtualCards: s.virtualCards,
            }),
        }
    )
);
