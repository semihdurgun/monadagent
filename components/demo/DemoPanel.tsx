'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Users, 
  FileText, 
  Clock, 
  Play, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function DemoPanel() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [demoResults, setDemoResults] = useState<Record<string, any>>({});
  const store = useAppStore();

  const demos = [
    {
      id: 'subscription',
      title: 'Abonelik Yönetimi',
      description: 'Netflix, Spotify gibi tekrarlayan ödemeler',
      icon: CreditCard,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      fields: [
        { name: 'service', label: 'Servis Adı', placeholder: 'Netflix', type: 'text' },
        { name: 'amount', label: 'Miktar (USDT)', placeholder: '15', type: 'number' },
        { name: 'interval', label: 'Sıklık', placeholder: 'monthly', type: 'select', options: ['daily', 'weekly', 'monthly', 'yearly'] }
      ]
    },
    {
      id: 'payment_card',
      title: 'Tek Kullanımlık Ödeme',
      description: 'E-ticaret için güvenli tek seferlik ödemeler',
      icon: CreditCard,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      fields: [
        { name: 'amount', label: 'Miktar (USDT)', placeholder: '2500', type: 'number' },
        { name: 'merchant', label: 'Merchant Adresi', placeholder: '0x...', type: 'text' },
        { name: 'validMinutes', label: 'Geçerlilik (dakika)', placeholder: '10', type: 'number' }
      ]
    },
    {
      id: 'shared_pot',
      title: 'Ortak Kasa',
      description: 'Ev arkadaşlarıyla faturaları paylaşma',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      fields: [
        { name: 'name', label: 'Kasa Adı', placeholder: 'Kira ve Faturalar', type: 'text' },
        { name: 'members', label: 'Üye Adresleri (virgülle ayırın)', placeholder: '0x..., 0x...', type: 'text' },
        { name: 'threshold', label: 'Onay Gereksinimi', placeholder: '2', type: 'number' }
      ]
    },
    {
      id: 'digital_will',
      title: 'Dijital Vasiyet',
      description: 'Otomatik miras dağıtımı',
      icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      fields: [
        { name: 'name', label: 'Vasiyet Adı', placeholder: 'Aile Vasiyeti', type: 'text' },
        { name: 'beneficiaries', label: 'Varisler (adres:yüzde, adres:yüzde)', placeholder: '0x...:60, 0x...:40', type: 'text' },
        { name: 'inactivityDays', label: 'Bekleyiş Süresi (gün)', placeholder: '365', type: 'number' }
      ]
    },
    {
      id: 'scheduled_payment',
      title: 'Otomatik Ödeme',
      description: 'Planlı ve tekrarlayan ödemeler',
      icon: Clock,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950',
      fields: [
        { name: 'name', label: 'Ödeme Adı', placeholder: 'Kira Ödemesi', type: 'text' },
        { name: 'amount', label: 'Miktar (USDT)', placeholder: '5000', type: 'number' },
        { name: 'recipient', label: 'Alıcı Adresi', placeholder: '0x...', type: 'text' },
        { name: 'schedule', label: 'Sıklık', placeholder: 'monthly', type: 'select', options: ['daily', 'weekly', 'monthly', 'yearly'] }
      ]
    }
  ];

  const runDemo = (demoId: string, formData: Record<string, string>) => {
    setDemoResults(prev => ({
      ...prev,
      [demoId]: {
        status: 'running',
        message: 'Demo çalıştırılıyor...',
        timestamp: new Date().toLocaleTimeString()
      }
    }));

    // Simulate demo execution
    setTimeout(() => {
      setDemoResults(prev => ({
        ...prev,
        [demoId]: {
          status: 'success',
          message: `${demos.find(d => d.id === demoId)?.title} başarıyla oluşturuldu!`,
          timestamp: new Date().toLocaleTimeString(),
          data: formData
        }
      }));
    }, 2000);
  };

  const renderDemoForm = (demo: any) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const result = demoResults[demo.id];

    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          {demo.fields.map((field: any) => (
            <div key={field.name} className="space-y-1">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === 'select' ? (
                <select
                  id={field.name}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                >
                  <option value="">Seçiniz</option>
                  {field.options?.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

        <Button 
          onClick={() => runDemo(demo.id, formData)}
          disabled={result?.status === 'running'}
          className="w-full"
        >
          {result?.status === 'running' ? (
            <>
              <Play className="w-4 h-4 mr-2 animate-pulse" />
              Çalıştırılıyor...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Demo Çalıştır
            </>
          )}
        </Button>

        {result && (
          <div className={`p-3 rounded-md ${
            result.status === 'success' 
              ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' 
              : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-center gap-2">
              {result.status === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-sm font-medium">{result.message}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{result.timestamp}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">🚀 Demo Panel</h2>
        <p className="text-muted-foreground">
          MetaMask Delegation Toolkit ile Smart Account özelliklerini test edin
        </p>
      </div>

      <div className="grid gap-4">
        {demos.map((demo) => {
          const Icon = demo.icon;
          const isActive = activeDemo === demo.id;
          
          return (
            <Card key={demo.id} className={`border-2 transition-all ${
              isActive ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
            }`}>
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setActiveDemo(isActive ? null : demo.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${demo.bgColor}`}>
                    <Icon className={`w-5 h-5 ${demo.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{demo.title}</h3>
                    <p className="text-sm text-muted-foreground">{demo.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isActive ? 'Kapat' : 'Aç'}
                  </div>
                </div>
              </div>

              {isActive && (
                <div className="px-4 pb-4 border-t border-border">
                  {renderDemoForm(demo)}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          💡 Bu demolar gerçek blockchain işlemleri simüle eder. 
          Gerçek kullanım için MetaMask cüzdanınızı bağlayın.
        </p>
      </div>
    </div>
  );
}
