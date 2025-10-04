import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Clock, 
  DollarSign, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  Zap
} from 'lucide-react';
import { 
  createSmartAccountDelegation, 
  getBlockchainDelegation, 
  useBlockchainDelegation,
  revokeBlockchainDelegation,
  isContractDeployed,
  type BlockchainDelegationConfig 
} from '@/lib/blockchainDelegation';

export function BlockchainDelegationDemo() {
  const [friendAddress, setFriendAddress] = useState('0x1234567890123456789012345678901234567890');
  const [amount, setAmount] = useState('1.0');
  const [duration, setDuration] = useState('3600'); // 1 saat
  const [maxUses, setMaxUses] = useState('3');
  const [isCreating, setIsCreating] = useState(false);
  const [delegationId, setDelegationId] = useState('');
  const [delegation, setDelegation] = useState<any>(null);
  const [sendAmount, setSendAmount] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [contractDeployed, setContractDeployed] = useState<boolean | null>(null);

  // Contract deployment kontrolü
  const checkContractDeployment = async () => {
    try {
      const deployed = await isContractDeployed();
      setContractDeployed(deployed);
    } catch (error) {
      console.error('Contract deployment check error:', error);
      setContractDeployed(false);
    }
  };

  const handleCreateDelegation = async () => {
    if (!friendAddress || !amount) return;
    
    setIsCreating(true);
    try {
      const config: BlockchainDelegationConfig = {
        to: friendAddress,
        smartAccount: '', // Boş, otomatik oluşturulacak
        amount,
        durationSeconds: parseInt(duration),
        maxUses: parseInt(maxUses),
        allowedActions: ['transfer', 'spend', 'withdraw']
      };

      const result = await createSmartAccountDelegation(config);
      
      if (result.success) {
        setDelegationId(result.delegationId!);
        alert(`✅ Blockchain delegation oluşturuldu!\n\nDelegation ID: ${result.delegationId}\nTransaction: ${result.transactionHash}\n\n📋 Bu Delegation ID'yi arkadaşınıza verin!\nArkadaşınız "Arkadaş Kullanımı" tabından bu ID ile delegation'ı kullanabilir.`);
      } else {
        alert(`❌ Hata: ${result.error}`);
      }
    } catch (error) {
      console.error('Delegation creation error:', error);
      alert('Delegation oluşturulamadı');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGetDelegation = async () => {
    if (!delegationId || !friendAddress) return;
    
    try {
      const delegationInfo = await getBlockchainDelegation(delegationId, friendAddress);
      if (delegationInfo) {
        setDelegation(delegationInfo);
        console.log('Blockchain delegation info:', delegationInfo);
      } else {
        alert('Delegation bulunamadı veya yetkiniz yok');
      }
    } catch (error) {
      console.error('Get delegation error:', error);
      alert('Delegation bilgileri alınamadı');
    }
  };

  const handleUseDelegation = async () => {
    if (!delegation || !sendAmount || !sendTo) return;
    
    setIsLoading(true);
    try {
      const result = await useBlockchainDelegation(delegationId, sendAmount, sendTo);
      
      if (result.success) {
        alert(`✅ ${sendAmount} MON başarıyla ${sendTo} adresine gönderildi!\n\nTransaction: ${result.transactionHash}`);
        // Delegation bilgilerini yenile
        await handleGetDelegation();
      } else {
        alert(`❌ İşlem başarısız: ${result.error}`);
      }
    } catch (error) {
      console.error('Usage error:', error);
      alert('İşlem sırasında hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRevokeDelegation = async () => {
    if (!delegationId) return;
    
    setIsRevoking(true);
    try {
      const result = await revokeBlockchainDelegation(delegationId);
      
      if (result.success) {
        alert(`✅ Delegation başarıyla iptal edildi!\n\nTransaction: ${result.transactionHash}\n\nArkadaşınız artık bu delegation'ı kullanamaz.`);
        // Delegation bilgilerini yenile
        await handleGetDelegation();
      } else {
        alert(`❌ Delegation iptal edilemedi: ${result.error}`);
      }
    } catch (error) {
      console.error('Revoke delegation error:', error);
      alert('Delegation iptal edilemedi');
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Globe className="w-6 h-6 text-blue-500" />
          Blockchain Delegation Sistemi
        </h2>
        <p className="text-muted-foreground">
          Gerçek blockchain'de çalışan delegation sistemi - Dünya çapında erişilebilir
        </p>
      </div>

      {/* Contract Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Contract Durumu
          </CardTitle>
          <CardDescription>
            Blockchain contract'ının deploy durumu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Contract Address</div>
              <code className="text-xs">0x5f031d3a4c7309509d82b3fe19094bf5b5d2a108</code>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={checkContractDeployment}
            >
              <Zap className="w-3 h-3 mr-1" />
              Kontrol Et
            </Button>
          </div>
          
          {contractDeployed !== null && (
            <Alert>
              {contractDeployed ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>✅ Contract Deploy Edilmiş!</strong> Blockchain delegation sistemi kullanılabilir.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>❌ Contract Deploy Edilmemiş</strong> Önce contract'ı deploy edin.
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Create Delegation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Blockchain Delegation Oluştur
          </CardTitle>
          <CardDescription>
            Smart Account ile blockchain'de delegation oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="friendAddress">Arkadaş Adresi</Label>
              <Input
                id="friendAddress"
                placeholder="0x123..."
                value={friendAddress}
                onChange={(e) => setFriendAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">MON Miktarı</Label>
              <Input
                id="amount"
                type="number"
                step="0.1"
                placeholder="1.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Süre (Saniye)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="3600"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                3600 = 1 saat, 86400 = 24 saat
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">Maksimum Kullanım</Label>
              <Input
                id="maxUses"
                type="number"
                placeholder="3"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleCreateDelegation}
              disabled={isCreating || !friendAddress || !amount || contractDeployed === false}
              className="w-full"
              size="lg"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Blockchain'de Oluşturuluyor...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Blockchain Delegation Oluştur
                </>
              )}
            </Button>

            {contractDeployed === false && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Contract deploy edilmediği için delegation oluşturulamaz.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Get Delegation */}
      {delegationId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-purple-500" />
              Delegation Bilgilerini Getir
            </CardTitle>
            <CardDescription>
              Blockchain'den delegation bilgilerini alın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delegation ID</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <code className="text-sm">{delegationId}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(delegationId)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Arkadaş Adresi</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <code className="text-sm">{friendAddress.slice(0, 10)}...</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(friendAddress)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGetDelegation}
              className="w-full"
              disabled={!delegationId || !friendAddress}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Blockchain'den Delegation Bilgilerini Getir
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delegation Info */}
      {delegation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Blockchain Delegation Bilgileri
            </CardTitle>
            <CardDescription>
              Blockchain'den alınan gerçek delegation bilgileri
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>🌍 Global Erişim:</strong> Bu delegation dünyanın herhangi bir yerinden erişilebilir!
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Smart Account</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <code className="text-sm">{delegation.smartAccount?.slice(0, 10)}...</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(delegation.smartAccount)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Durum</Label>
                <Badge variant={delegation.isActive ? 'default' : 'secondary'}>
                  {delegation.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <DollarSign className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                <div className="text-sm font-medium">Kalan MON</div>
                <div className="text-lg font-bold">{delegation.remainingAmount} MON</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-1 text-green-500" />
                <div className="text-sm font-medium">Bitiş Zamanı</div>
                <div className="text-lg font-bold">
                  {new Date(delegation.expiresAt * 1000).toLocaleDateString()}
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Shield className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                <div className="text-sm font-medium">Kalan Kullanım</div>
                <div className="text-lg font-bold">{delegation.maxUses - delegation.usedCount}</div>
              </div>
            </div>

            {/* Revoke Button */}
            <div className="pt-4 border-t">
              <Button 
                onClick={handleRevokeDelegation}
                disabled={isRevoking || !delegation.isActive}
                variant="destructive"
                className="w-full"
              >
                {isRevoking ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    İptal Ediliyor...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Delegation'ı İptal Et
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                İptal ettikten sonra arkadaşınız bu delegation'ı kullanamaz
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Use Delegation */}
      {delegation && delegation.isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-500" />
              Blockchain'de MON Kullan
            </CardTitle>
            <CardDescription>
              Arkadaşınızın blockchain'de MON gönderme arayüzü
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sendAmount">Gönderilecek MON</Label>
                <Input
                  id="sendAmount"
                  type="number"
                  step="0.1"
                  placeholder="0.1"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sendTo">Alıcı Adres</Label>
                <Input
                  id="sendTo"
                  placeholder="0x..."
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handleUseDelegation}
              disabled={isLoading || !sendAmount || !sendTo || parseFloat(sendAmount) > parseFloat(delegation.remainingAmount)}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Blockchain'de Gönderiliyor...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  {sendAmount} MON Blockchain'de Gönder
                </>
              )}
            </Button>

            {sendAmount && parseFloat(sendAmount) > parseFloat(delegation.remainingAmount) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Yetersiz bakiye! Kalan MON: {delegation.remainingAmount}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
