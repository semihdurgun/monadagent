import { useAppStore } from './store';
import { parseWalletError, shouldShowErrorInChat } from './errorHandling';
import { 
    createNativeSubscription,
    createNativeOneTimePayment,
    revokeNativeDelegation,
    type NativeDelegationConfig 
} from './nativeDelegation';
import { 
    createSharedPot, 
    addFundsToSharedPot,
    type SharedPotConfig 
} from './sharedPots';
import { 
    createDigitalWill, 
    createScheduledPayment,
    type DigitalWillConfig,
    type ScheduledPaymentConfig 
} from './automation';
import { 
    createVirtualCard,
    getMerchantAddress,
    type VirtualCardConfig 
} from './virtualCard';

export interface AICommand {
    type: 'subscription' | 'payment_card' | 'shared_pot' | 'digital_will' | 'scheduled_payment' | 'virtual_card' | 'help' | 'general';
    action: string;
    parameters?: any;
    response: string;
}

export class AICommandProcessor {
    private store = useAppStore.getState();

    async processCommand(userMessage: string): Promise<AICommand> {
        const message = userMessage.toLowerCase().trim();
        const { sa } = this.store;

        // Subscription commands
        if (message.includes('abonelik') || message.includes('subscription')) {
            if (message.includes('başlat') || message.includes('start') || message.includes('oluştur')) {
                if (!sa) {
                    return { type: 'general', action: 'error', response: '❌ Abonelik oluşturmak için Smart Account gerekiyor. Lütfen önce Smart Account oluşturun.' };
                }
                return await this.handleCreateSubscription(message);
            }
            if (message.includes('iptal') || message.includes('cancel') || message.includes('dur')) {
                return await this.handleCancelSubscription(message);
            }
            if (message.includes('listele') || message.includes('list') || message.includes('göster')) {
                return await this.handleListSubscriptions();
            }
        }

        // Payment card commands
        if (message.includes('ödeme kartı') || message.includes('payment card') || message.includes('tek kullanımlık')) {
            if (!sa) {
                return { type: 'general', action: 'error', response: '❌ Ödeme kartı oluşturmak için Smart Account gerekiyor. Lütfen önce Smart Account oluşturun.' };
            }
            return await this.handleCreatePaymentCard(message);
        }

        // Shared pot commands
        if (message.includes('ortak kasa') || message.includes('shared pot') || message.includes('ev arkadaşı')) {
            if (message.includes('oluştur') || message.includes('create') || message.includes('başlat')) {
                if (!sa) {
                    return { type: 'general', action: 'error', response: '❌ Ortak kasa oluşturmak için Smart Account gerekiyor. Lütfen önce Smart Account oluşturun.' };
                }
                return await this.handleCreateSharedPot(message);
            }
            if (message.includes('para ekle') || message.includes('add funds')) {
                return await this.handleAddFundsToPot(message);
            }
        }

        // Digital will commands
        if (message.includes('vasiyet') || message.includes('will') || message.includes('miras')) {
            if (!sa) {
                return { type: 'general', action: 'error', response: '❌ Dijital vasiyet oluşturmak için Smart Account gerekiyor. Lütfen önce Smart Account oluşturun.' };
            }
            return await this.handleCreateDigitalWill(message);
        }

        // Scheduled payment commands
        if (message.includes('otomatik ödeme') || message.includes('scheduled payment') || message.includes('planlı')) {
            if (!sa) {
                return { type: 'general', action: 'error', response: '❌ Planlı ödeme oluşturmak için Smart Account gerekiyor. Lütfen önce Smart Account oluşturun.' };
            }
            return await this.handleCreateScheduledPayment(message);
        }

        // Virtual card commands
        if (message.includes('sanal kart') || message.includes('virtual card') || message.includes('harcama izni') || message.includes('güvenli alışveriş')) {
            if (!sa) {
                return { type: 'general', action: 'error', response: '❌ Sanal kart oluşturmak için Smart Account gerekiyor. Lütfen önce Smart Account oluşturun.' };
            }
            return await this.handleCreateVirtualCard(message);
        }


        // Help command
        if (message.includes('yardım') || message.includes('help') || message.includes('komutlar')) {
            return this.handleHelp();
        }

        // Default response - let Gemini handle general questions
        return {
            type: 'general',
            action: 'unknown',
            response: ''
        };
    }

    private async handleCreateSubscription(message: string): Promise<AICommand> {
        try {
            // Extract parameters from message (simplified parsing)
            const amount = this.extractAmount(message) || '0.1';
            const interval = this.extractInterval(message) || 'monthly';
            const recipient = this.extractAddress(message) || '0x742d35Cc6634C0532925a3b8D1C0d8c3c3c3c3c3c'; // Mock Netflix address
            const name = this.extractName(message) || 'Netflix Aboneliği';

            const config = {
                id: `sub_${Date.now()}`,
                name,
                recipient: recipient as `0x${string}`,
                amount,
                interval: interval as any,
            };

            const result = await createNativeSubscription(config);
            
            // Save to store
            this.store.addSubscription({
                id: config.id,
                name: config.name,
                merchant: config.recipient,
                amount: config.amount,
                interval: config.interval,
                isActive: true,
                createdAt: Date.now(),
                usageCount: 0,
            });

            return {
                type: 'subscription',
                action: 'created',
                parameters: config,
                response: `✅ ${name} aboneliği başarıyla oluşturuldu!\n\n📋 Detaylar:\n• Miktar: ${amount} MON\n• Sıklık: ${this.getIntervalText(interval)}\n• Alıcı: ${recipient.slice(0, 10)}...\n\nBu abonelik artık otomatik olarak çalışacak. İptal etmek için "aboneliği iptal et" yazabilirsiniz.`
            };
        } catch (error) {
            return {
                type: 'subscription',
                action: 'error',
                response: `❌ Abonelik oluşturulurken hata oluştu: ${parseWalletError(error)}`
            };
        }
    }

    private async handleCancelSubscription(message: string): Promise<AICommand> {
        const subscriptions = this.store.subscriptions;
        if (subscriptions.length === 0) {
            return {
                type: 'subscription',
                action: 'no_subscriptions',
                response: '❌ Aktif aboneliğiniz bulunmuyor.'
            };
        }

        // Cancel the first active subscription (simplified)
        const activeSubscription = subscriptions.find(sub => sub.isActive);
        if (activeSubscription) {
            try {
                await revokeNativeDelegation(activeSubscription.id);
                this.store.updateSubscription(activeSubscription.id, { isActive: false });
                
                return {
                    type: 'subscription',
                    action: 'cancelled',
                    response: `✅ ${activeSubscription.name} aboneliği başarıyla iptal edildi!`
                };
            } catch (error) {
                return {
                    type: 'subscription',
                    action: 'error',
                    response: `❌ Abonelik iptal edilirken hata oluştu: ${parseWalletError(error)}`
                };
            }
        }

        return {
            type: 'subscription',
            action: 'no_active',
            response: '❌ İptal edilecek aktif abonelik bulunamadı.'
        };
    }

    private handleListSubscriptions(): AICommand {
        const subscriptions = this.store.subscriptions;
        
        if (subscriptions.length === 0) {
            return {
                type: 'subscription',
                action: 'list_empty',
                response: '📋 Aktif aboneliğiniz bulunmuyor.'
            };
        }

        const list = subscriptions.map(sub => 
            `• ${sub.name} - ${sub.amount} MON (${this.getIntervalText(sub.interval)}) - ${sub.isActive ? '✅ Aktif' : '❌ İptal'}`
        ).join('\n');

        return {
            type: 'subscription',
            action: 'list',
            response: `📋 Abonelikleriniz:\n\n${list}`
        };
    }

    private async handleCreatePaymentCard(message: string): Promise<AICommand> {
        try {
            const amount = this.extractAmount(message) || '0.05';
            const recipient = this.extractAddress(message) || '0x742d35Cc6634C0532925a3b8D1C0d8c3c3c3c3c3c';
            const validMinutes = this.extractMinutes(message) || 10;
            const name = this.extractName(message) || 'Tek Kullanımlık Ödeme';

            const config = {
                id: `card_${Date.now()}`,
                name,
                recipient: recipient as `0x${string}`,
                amount,
                validForMinutes: validMinutes,
            };

            const result = await createNativeOneTimePayment(config);
            
            // Save to store
            this.store.addPaymentCard({
                id: config.id,
                merchant: config.recipient,
                amount: config.amount,
                validForMinutes: config.validForMinutes,
                isUsed: false,
                expiresAt: Date.now() + (config.validForMinutes * 60 * 1000),
                createdAt: Date.now(),
            });

            return {
                type: 'payment_card',
                action: 'created',
                parameters: config,
                response: `💳 ${name} ödeme kartı oluşturuldu!\n\n📋 Detaylar:\n• Miktar: ${amount} MON\n• Geçerlilik: ${validMinutes} dakika\n• Alıcı: ${recipient.slice(0, 10)}...\n\n⚠️ Bu kart sadece ${validMinutes} dakika geçerli ve tek kullanımlıktır.`
            };
        } catch (error) {
            return {
                type: 'payment_card',
                action: 'error',
                response: `❌ Ödeme kartı oluşturulurken hata oluştu: ${parseWalletError(error)}`
            };
        }
    }

    private async handleCreateSharedPot(message: string): Promise<AICommand> {
        try {
            const name = this.extractName(message) || 'Ortak Kasa';
            const members = this.extractAddresses(message) || ['0x742d35Cc6634C0532925a3b8D1C0d8c3c3c3c3c3c'];
            const threshold = this.extractThreshold(message) || Math.ceil(members.length / 2);

            const config: SharedPotConfig = {
                id: `pot_${Date.now()}`,
                name,
                description: `${name} için ortak kasa`,
                members: members as `0x${string}`[],
                threshold,
            };

            const result = await createSharedPot(config);
            
            // Save to store
            this.store.addSharedPot({
                id: config.id,
                name: config.name,
                members: config.members,
                threshold: config.threshold,
                smartAccountAddress: result.sharedPot.smartAccountAddress,
                balance: '0',
                isActive: true,
                createdAt: Date.now(),
            });

            return {
                type: 'shared_pot',
                action: 'created',
                parameters: config,
                response: `🏠 ${name} ortak kasası oluşturuldu!\n\n📋 Detaylar:\n• Üyeler: ${members.length} kişi\n• Onay gereksinimi: ${threshold}/${members.length}\n• Smart Account: ${result.sharedPot.smartAccountAddress.slice(0, 10)}...\n\nArtık üyeler bu kasaya para ekleyebilir ve ortak harcamalar yapabilir.`
            };
        } catch (error) {
            return {
                type: 'shared_pot',
                action: 'error',
                response: `❌ Ortak kasa oluşturulurken hata oluştu: ${parseWalletError(error)}`
            };
        }
    }

    private async handleAddFundsToPot(message: string): Promise<AICommand> {
        const pots = this.store.sharedPots;
        if (pots.length === 0) {
            return {
                type: 'shared_pot',
                action: 'no_pots',
                response: '❌ Ortak kasanız bulunmuyor.'
            };
        }

        const amount = this.extractAmount(message) || '0.1';
        const pot = pots[0]; // Use first pot for simplicity

        try {
            await addFundsToSharedPot(
                pot.smartAccountAddress,
                amount
            );

            return {
                type: 'shared_pot',
                action: 'funds_added',
                response: `✅ ${pot.name} kasasına ${amount} MON eklendi!`
            };
        } catch (error) {
            return {
                type: 'shared_pot',
                action: 'error',
                response: `❌ Para eklenirken hata oluştu: ${parseWalletError(error)}`
            };
        }
    }

    private async handleCreateDigitalWill(message: string): Promise<AICommand> {
        try {
            const name = this.extractName(message) || 'Dijital Vasiyet';
            const beneficiaries = this.extractBeneficiaries(message) || [
                { address: '0x742d35Cc6634C0532925a3b8D1C0d8c3c3c3c3c3c' as `0x${string}`, percentage: 60 },
                { address: '0x842d35Cc6634C0532925a3b8D1C0d8c3c3c3c3c3c' as `0x${string}`, percentage: 40 }
            ];
            const inactivityPeriod = this.extractDays(message) || 365;
            const executors = this.extractAddresses(message) || ['0x942d35Cc6634C0532925a3b8D1C0d8c3c3c3c3c3c'];

            const config: DigitalWillConfig = {
                id: `will_${Date.now()}`,
                name,
                beneficiaries,
                inactivityPeriod,
                executors: executors as `0x${string}`[],
                tokens: [process.env.NEXT_PUBLIC_TUSD as `0x${string}` || '0x1234567890123456789012345678901234567890'],
            };

            const result = await createDigitalWill(config);
            
            // Save to store
            this.store.addDigitalWill({
                id: config.id,
                name: config.name,
                beneficiaries: config.beneficiaries,
                inactivityPeriod: config.inactivityPeriod,
                executors: config.executors,
                isActive: true,
                createdAt: Date.now(),
                lastActivity: Date.now(),
            });

            return {
                type: 'digital_will',
                action: 'created',
                parameters: config,
                response: `📜 ${name} dijital vasiyeti oluşturuldu!\n\n📋 Detaylar:\n• Bekleyiş süresi: ${inactivityPeriod} gün\n• Varisler: ${beneficiaries.length} kişi\n• Executor'lar: ${executors.length} kişi\n\n${inactivityPeriod} gün boyunca hesap aktivitesi olmazsa vasiyet otomatik olarak devreye girecek.`
            };
        } catch (error) {
            return {
                type: 'digital_will',
                action: 'error',
                response: `❌ Dijital vasiyet oluşturulurken hata oluştu: ${parseWalletError(error)}`
            };
        }
    }

    private async handleCreateScheduledPayment(message: string): Promise<AICommand> {
        try {
            const name = this.extractName(message) || 'Otomatik Ödeme';
            const recipient = this.extractAddress(message) || '0x742d35Cc6634C0532925a3b8D1C0d8c3c3c3c3c3c';
            const amount = this.extractAmount(message) || '0.1';
            const schedule = this.extractSchedule(message) || 'monthly';

            const config: ScheduledPaymentConfig = {
                id: `scheduled_${Date.now()}`,
                name,
                recipient: recipient as `0x${string}`,
                token: '0x0000000000000000000000000000000000000000', // Native token
                amount,
                decimals: 18, // MON has 18 decimals
                schedule: {
                    type: schedule as any,
                    dayOfMonth: schedule === 'monthly' ? 1 : undefined,
                },
                startDate: Math.floor(Date.now() / 1000),
            };

            const result = await createScheduledPayment(config);
            
            // Save to store
            this.store.addScheduledPayment({
                id: config.id,
                name: config.name,
                recipient: config.recipient,
                amount: config.amount,
                schedule: config.schedule,
                nextExecution: result.summary.nextExecution,
                executionsCount: 0,
                isActive: true,
            });

            return {
                type: 'scheduled_payment',
                action: 'created',
                parameters: config,
                response: `⏰ ${name} otomatik ödemesi oluşturuldu!\n\n📋 Detaylar:\n• Miktar: ${amount} MON\n• Sıklık: ${this.getScheduleText(schedule)}\n• Alıcı: ${recipient.slice(0, 10)}...\n\nBu ödeme otomatik olarak belirlenen tarihlerde gerçekleşecek.`
            };
        } catch (error) {
            return {
                type: 'scheduled_payment',
                action: 'error',
                response: `❌ Otomatik ödeme oluşturulurken hata oluştu: ${parseWalletError(error)}`
            };
        }
    }

    private handleHelp(): AICommand {
        return {
            type: 'help',
            action: 'show_commands',
            response: `🤖 MonadAgent AI Asistanı - Mevcut Komutlar:\n\n📋 **Abonelik Yönetimi:**\n• "Netflix aboneliği başlat, aylık 0.1 MON" - Yeni abonelik oluştur\n• "Aboneliği iptal et" - Aktif aboneliği iptal et\n\n💳 **Sanal Kartlar & Alışveriş:**\n• "Kizzy'den 1.2 MON'luk NFT al" - NFT satın alma\n• "MagmaDAO'ya 5 MON yatır" - Token satın alma\n• "0.05 MON sanal kart oluştur" - Güvenli tek kullanımlık kart\n\n🏠 **Ortak Kasalar:**\n• "Ev arkadaşlarımla ortak kasa oluştur" - Multisig kasa\n• "Kasaya 0.1 MON ekle" - Para ekleme\n\n📜 **Dijital Vasiyet:**\n• "Dijital vasiyet oluştur" - Otomatik miras sistemi\n\n⏰ **Otomatik Ödemeler:**\n• "Aylık 0.1 MON kira ödemesi" - Planlı ödeme\n\n🔒 **Güvenlik Özellikleri:**\n• Kullanım limitleri ve süre kısıtlamaları\n• Tek kullanımlık yetkiler\n• Smart Account ile güvenli işlemler\n\n🎯 **Blockchain Delegation:**\n• "Blockchain Delegation" tabından gerçek blockchain işlemleri yapabilirsiniz\n• Contract: 0x5f031d3a4c7309509d82b3fe19094bf5b5d2a108\n\n❓ Daha fazla bilgi için sorularınızı sorun!`
        };
    }

    // Helper methods for extracting parameters from messages
    private extractAmount(message: string): string | null {
        const match = message.match(/(\d+(?:\.\d+)?)\s*(mon|tl|₺|\$)/i);
        return match ? match[1] : null;
    }

    private extractInterval(message: string): string | null {
        if (message.includes('günlük') || message.includes('daily')) return 'daily';
        if (message.includes('haftalık') || message.includes('weekly')) return 'weekly';
        if (message.includes('aylık') || message.includes('monthly')) return 'monthly';
        if (message.includes('yıllık') || message.includes('yearly')) return 'yearly';
        return null;
    }

    private extractAddress(message: string): string | null {
        const match = message.match(/0x[a-fA-F0-9]{40}/);
        return match ? match[0] : null;
    }

    private extractAddresses(message: string): string[] | null {
        const matches = message.match(/0x[a-fA-F0-9]{40}/g);
        return matches || null;
    }

    private extractName(message: string): string | null {
        // Simple name extraction - look for quoted text or after certain keywords
        const quoted = message.match(/"([^"]+)"/);
        if (quoted) return quoted[1];
        
        // Look for names after "için" or "adıyla"
        const afterKeywords = message.match(/(?:için|adıyla|ismi)\s+([a-zA-ZçğıöşüÇĞIİÖŞÜ\s]+)/i);
        if (afterKeywords) return afterKeywords[1].trim();
        
        return null;
    }

    private extractMinutes(message: string): number | null {
        const match = message.match(/(\d+)\s*dakika?/i);
        return match ? parseInt(match[1]) : null;
    }

    private extractDays(message: string): number | null {
        const match = message.match(/(\d+)\s*gün/i);
        return match ? parseInt(match[1]) : null;
    }

    private extractThreshold(message: string): number | null {
        const match = message.match(/(\d+)\/(\d+)/);
        if (match) return parseInt(match[1]);
        
        const simple = message.match(/(\d+)\s*onay/i);
        return simple ? parseInt(simple[1]) : null;
    }

    private extractBeneficiaries(message: string): { address: `0x${string}`; percentage: number }[] | null {
        // This would need more sophisticated parsing in a real implementation
        return null;
    }

    private extractSchedule(message: string): string | null {
        if (message.includes('günlük') || message.includes('daily')) return 'daily';
        if (message.includes('haftalık') || message.includes('weekly')) return 'weekly';
        if (message.includes('aylık') || message.includes('monthly')) return 'monthly';
        if (message.includes('yıllık') || message.includes('yearly')) return 'yearly';
        return null;
    }

    private getIntervalText(interval: string): string {
        const intervals = {
            daily: 'Günlük',
            weekly: 'Haftalık',
            monthly: 'Aylık',
            yearly: 'Yıllık'
        };
        return intervals[interval as keyof typeof intervals] || interval;
    }

    private getScheduleText(schedule: string): string {
        const schedules = {
            daily: 'Her gün',
            weekly: 'Haftalık',
            monthly: 'Aylık',
            yearly: 'Yıllık'
        };
        return schedules[schedule as keyof typeof schedules] || schedule;
    }

    private async handleCreateVirtualCard(message: string): Promise<AICommand> {
        try {
            // Extract merchant name and amount from message
            const merchant = this.extractMerchant(message) || 'Kizzy';
            const amount = this.extractAmount(message) || '2.5';
            const duration = this.extractDuration(message) || 1; // 1 hour default

            const merchantAddress = getMerchantAddress(merchant);

            const config: VirtualCardConfig = {
                merchant,
                merchantAddress,
                amount,
                duration, // hours
                maxUses: 1, // Single use
            };

            // Create virtual card
            const result = await createVirtualCard(config);
            
            if (result.success && result.virtualCard) {
                return {
                    type: 'virtual_card',
                    action: 'created',
                    parameters: { config, virtualCard: result.virtualCard },
                    response: `🎴 ${merchant} için sanal kart oluşturuldu!\n\n📋 Detaylar:\n• Miktar: ${amount} MON\n• Süre: ${duration} saat\n• Tek kullanım: ✅\n• Merchant: ${merchant}\n• Adres: ${merchantAddress.slice(0, 10)}...\n\n⏰ ${duration} saat sonra otomatik olarak kapanacak.\n\n🛒 Trendyol artık bu kartı kullanabilir!`,
                };
            } else {
                throw new Error(result.error || 'Sanal kart oluşturulamadı');
            }

        } catch (error) {
            return {
                type: 'general',
                action: 'error',
                response: `❌ Sanal kart oluşturulamadı: ${parseWalletError(error)}`,
            };
        }
    }

    private extractMerchant(message: string): string | null {
        const merchants = ['kizzy', 'magmadao', 'trendyol', 'amazon', 'nike', 'adidas'];
        const lowerMessage = message.toLowerCase();
        
        for (const merchant of merchants) {
            if (lowerMessage.includes(merchant)) {
                if (merchant === 'magmadao') {
                    return 'MagmaDAO';
                }
                return merchant.charAt(0).toUpperCase() + merchant.slice(1);
            }
        }
        
        return null;
    }

    private extractDuration(message: string): number | null {
        const durationRegex = /(\d+)\s*(saat|hour|hr)/i;
        const match = message.match(durationRegex);
        return match ? parseInt(match[1]) : null;
    }


    private extractMaxUses(message: string): number | null {
        const maxUsesRegex = /(\d+)\s*(kere|kez|uses?)/i;
        const match = message.match(maxUsesRegex);
        return match ? parseInt(match[1]) : null;
    }
}
