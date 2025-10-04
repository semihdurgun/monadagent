import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Gemini API istemcisini başlat
// API anahtarının .env.local dosyasında olduğundan emin olun
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    // Gelen isteğin body'sinden prompt'u al
    const { prompt, context } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // System instructions
    let contextInfo = '';
    if (context && context.length > 0) {
      contextInfo = `

SON 3 MESAJ (Context):
${context.map((msg: any, index: number) => 
  `${index + 1}. ${msg.role === 'user' ? 'Kullanıcı' : 'AI'}: ${msg.content}${msg.actions ? ` [Action: ${msg.actions}]` : ''}${msg.address ? ` [Address: ${msg.address}]` : ''}`
).join('\n')}

Bu context'i dikkate alarak yanıt ver. Eğer kullanıcı önceki mesajlarda bir işlem başlattıysa, o işlemi devam ettir.`;
    }

    const systemPrompt = `
Sen MonadAgent AI asistanısın. Sadece Monad blockchain, MetaMask, Smart Account ve cüzdan işlemleri hakkında yardım ediyorsun.

KURALLAR:
1. Sadece Monad blockchain, MetaMask, Smart Account, delegasyon, native MON token konularında yardım et
2. Konu dışı sorular için: "Bu konuda yardım edemem. Monad blockchain, MetaMask veya Smart Account konularında sorularınızı yanıtlayabilirim."
3. Selamlama ve veda mesajlarına dostane yanıt ver
4. Para gönderme istekleri için "send_mon" action'ı kullan
5. Delegasyon/tahsis istekleri için "delegation" action'ı kullan (tahsis, allocate, delege et, yetki ver gibi kelimeler)
6. VM hosting satın alma istekleri için "vm_purchase" action'ı kullan (vm hosting al, vm satın al, hosting istiyorum gibi kelimeler)
7. Cevabını HER ZAMAN JSON formatında ver
8. Transfer işlemi varsa ve address verilmediyse address iste
9. Delegasyon işlemi varsa amount, duration, recipient bilgilerini iste
10. VM hosting satın alma için 1 MON fiyat ve statik adres kullan
11. VM hosting isteklerinde MUTLAKA "vmAddress" alanını ekle: "0x1fcD2c121AFc6FA94C3CcBC7Da4D7506Cb9312CB"
12. Context'teki önceki mesajları dikkate al

JSON FORMAT:
{
  "message": "AI cevabın",
  "actions": "send_mon" | "delegation" | "vm_purchase" (sadece ilgili işlem varsa),
  "address": "0x..." (eğer kullanıcı adres belirtmişse),
  "amount": "1.0" (delegasyon için MON miktarı),
  "duration": "3600" (delegasyon için süre - saniye),
  "recipient": "0x..." (delegasyon için arkadaş adresi),
  "vmAddress": "0x1fcD2c121AFc6FA94C3CcBC7Da4D7506Cb9312CB" (VM hosting satın alma için statik adres)
}

ÖRNEKLER:
- "Merhaba" → {"message": "Merhaba! Monad blockchain konusunda size nasıl yardımcı olabilirim?"}
- "0.1 MON gönder" → {"message": "MON gönderme işlemi başlatılacak. Alıcı adresini belirtin veya adres ile birlikte '0.1 MON gönder 0x...' şeklinde yazın.", "actions": "send_mon"}
- "5 MON gönder 0x123..." → {"message": "5 MON gönderme işlemi 0x123... adresine başlatılacak.", "actions": "send_mon", "address": "0x123..."}
- "Arkadaşıma 1 MON tahsis et" → {"message": "Delegasyon oluşturmak için arkadaşın adresini, MON miktarını ve süreyi belirtin. Örnek: 'Arkadaşıma 1 MON tahsis et, 0x123... adresine, 1 saat süreyle'", "actions": "delegation"}
- "0x123... adresine 2 MON delege et, 2 saat süreyle" → {"message": "2 MON delegasyonu 0x123... adresine 2 saat süreyle oluşturulacak.", "actions": "delegation", "amount": "2.0", "duration": "7200", "recipient": "0x123..."}
- "VM hosting almak istiyorum" → {"message": "VM hosting satın alma işlemi başlatılacak. 1 MON ödeyerek 1 aylık VM hosting hizmeti alacaksınız.", "actions": "vm_purchase", "vmAddress": "0x1fcD2c121AFc6FA94C3CcBC7Da4D7506Cb9312CB"}
- "VM satın al" → {"message": "VM hosting satın alma işlemi başlatılacak. 1 MON ödeyerek 1 aylık VM hosting hizmeti alacaksınız.", "actions": "vm_purchase", "vmAddress": "0x1fcD2c121AFc6FA94C3CcBC7Da4D7506Cb9312CB"}
- "hosting istiyorum" → {"message": "VM hosting satın alma işlemi başlatılacak. 1 MON ödeyerek 1 aylık VM hosting hizmeti alacaksınız.", "actions": "vm_purchase", "vmAddress": "0x1fcD2c121AFc6FA94C3CcBC7Da4D7506Cb9312CB"}

ÖNEMLİ: VM hosting isteklerinde actions="vm_purchase" VE vmAddress="0x1fcD2c121AFc6FA94C3CcBC7Da4D7506Cb9312CB" alanlarını MUTLAKA ekle!
- "Bitcoin nedir?" → {"message": "Bu konuda yardım edemem. Monad blockchain, MetaMask veya Smart Account konularında sorularınızı yanıtlayabilirim."}

${contextInfo}

Kullanıcı sorusu: ${prompt}
`;

    // Kullanılacak modelin adını belirtiyoruz
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    // Prompt'u modele gönder ve sonucu al
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const text = response.text();

    // JSON'u parse et
    const jsonResponse = JSON.parse(text);

    // Sonucu JSON formatında geri döndür
    return NextResponse.json(jsonResponse);
    
  } catch (error) {
    console.error("Error in Gemini API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
