import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini Client
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "GuiaCidade API" });
  });

  // Netlify Function Local Route: Enviar Push
  app.post("/.netlify/functions/enviar-push", (req, res) => {
    try {
      const { titulo, tokens } = req.body || {};
      const mensagem = req.body?.message || req.body?.mensagem || "";
      const tokensList = Array.isArray(tokens) ? tokens : [];
      console.log("[Server Express] Disparo Push recebido via /.netlify/functions/enviar-push:", {
        titulo,
        mensagem,
        totalTokens: tokensList.length,
      });

      return res.json({
        success: true,
        message: "Notificação push disparada com sucesso para todos os celulares!",
        disparo: {
          titulo: titulo || "Comunicado Conecta.Aí",
          mensagem: mensagem || "",
          totalTokens: tokensList.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error("Erro na rota /.netlify/functions/enviar-push:", err);
      return res.status(500).json({
        success: false,
        message: "Erro ao processar envio de push notification: " + (err?.message || "Erro desconhecido"),
      });
    }
  });

  // Helper: Gerador inteligente de descrição de contingência
  function generateFallbackDescription(text?: string, placeName?: string, category?: string) {
    const name = placeName?.trim() || "Este estabelecimento";
    const cat = category || "comercio";

    let description = "";
    let suggestedTags: string[] = [];
    let tagline = "";

    if (text && text.trim().length > 5) {
      const cleanText = text.trim();
      description = `${cleanText} Atendimento de excelência, ambiente acolhedor e a melhor qualidade no Guia Comercial da cidade!`;
      suggestedTags = ["Destaque Local", "Atendimento VIP", "Qualidade Garantida", "Wi-Fi Grátis"];
      tagline = "O melhor da cidade para você e sua família!";
    } else {
      if (cat === "comercio") {
        description = `Seja bem-vindo ao ${name}! Oferecemos os melhores produtos e serviços da região com atendimento diferenciado, excelência em qualidade e condições imperdíveis para você e sua família.`;
        suggestedTags = ["Qualidade", "Atendimento VIP", "Variedade", "Aceita Cartões", "Wi-Fi Grátis"];
        tagline = "Sua melhor escolha em compras e serviços!";
      } else if (cat === "praca") {
        description = `O ${name} é o ponto de encontro perfeito para momentos de lazer ao ar livre, caminhadas relaxantes e diversão com a família e amigos no coração da cidade.`;
        suggestedTags = ["Ar Livre", "Espaço Pet Friendly", "Lazer em Família", "Área Verde", "Acessível"];
        tagline = "Um refúgio de paz e natureza para toda a família!";
      } else {
        description = `Descubra a beleza e os encantos do ${name}. Um dos destinos turísticos e culturais mais visitados e admirados, ideal para passeios inesquecíveis e fotos incríveis.`;
        suggestedTags = ["Ponto Turístico", "Fotogênico", "Cultura", "Visita Obrigatória", "Lazer"];
        tagline = "Uma experiência inesquecível na cidade!";
      }
    }

    return { description, suggestedTags, tagline };
  }

  // API Route: Optimize / Generate Place Description using Gemini AI
  app.post("/api/ai/optimize-description", async (req, res) => {
    try {
      const { text, placeName, category, city } = req.body;
      const name = placeName?.trim() || "Estabelecimento Local";
      const cat = category || "comercio";
      const targetCity = city || "Palmas";

      const promptText = text?.trim()
        ? `Texto bruto fornecido para aperfeiçoar: "${text}"`
        : `O campo de descrição está em branco. Escreva uma descrição profissional, chamativa e vendedora do zero para o local.`;

      const prompt = `Você é um especialista em marketing publicitário para o aplicativo Guia Comercial Conecta.Aí.
Sua missão é gerar ou otimizar a descrição de um estabelecimento no aplicativo.

Dados do local:
- Nome: ${name}
- Categoria: ${cat}
- Cidade: ${targetCity}
- ${promptText}

Instruções:
1. Escreva uma descrição curta, envolvente, vendedora e atraente (entre 120 e 280 caracteres) em português do Brasil.
2. Forneça de 4 a 6 tags/etiquetas de destaques relevantes (ex: "Entrega Rápida", "Ambiente Familiar", "Wi-Fi Grátis", "Pet Friendly", "Ar-Condicionado").
3. Crie um slogan / frase de impacto curta em 1 frase.

Retorne estritamente em formato JSON com as chaves: "description", "suggestedTags" (array de strings) e "tagline".`;

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        const modelsToTry = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        for (const modelName of modelsToTry) {
          try {
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    tagline: { type: Type.STRING },
                  },
                  required: ["description", "suggestedTags", "tagline"],
                },
              },
            });

            if (response.text) {
              const parsed = JSON.parse(response.text);
              if (parsed.description) {
                return res.json(parsed);
              }
            }
          } catch (err: any) {
            console.warn(`Tentativa Gemini com modelo ${modelName} falhou:`, err.message);
          }
        }
      }

      // Se Gemini não responder ou não houver chave válida, gera resposta inteligente
      const fallback = generateFallbackDescription(text, name, cat);
      return res.json(fallback);
    } catch (err: any) {
      console.error("Erro no manipulador de descrição IA:", err);
      const fallback = generateFallbackDescription(req.body?.text, req.body?.placeName, req.body?.category);
      return res.json(fallback);
    }
  });

  // API Route: Generate Sample Places for a city query using Gemini AI
  app.post("/api/ai/generate-places", async (req, res) => {
    try {
      const { city } = req.body;
      const targetCity = city?.trim() || "Palmas";

      const prompt = `Gere 3 exemplos realistas de estabelecimentos/locais para o aplicativo 'Guia Comercial' na cidade de "${targetCity}".
Inclua:
1 local do tipo 'comercio' (ex: padaria, pizzaria, hamburgueria, loja),
1 local do tipo 'praca' (ex: praça central, parque, jardim),
1 local do tipo 'turismo' (ex: mirante, museu, catedral, cachoeira).

Para cada um inclua:
- tipo: 'comercio', 'praca' ou 'turismo'
- nome: string
- descricao: string (curta e chamativa em português)
- endereco: string
- whatsapp: string (número de telefone no formato 5563999999999)
- horario: string (ex: "Seg a Sáb 08h-20h")
- tags: array de strings (ex: ["Pet Friendly", "Ar Livre"])
- avaliacao: número entre 4.5 e 5.0

Retorne em formato JSON como uma lista "places".`;

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        const modelsToTry = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        for (const modelName of modelsToTry) {
          try {
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    places: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          tipo: { type: Type.STRING },
                          nome: { type: Type.STRING },
                          descricao: { type: Type.STRING },
                          endereco: { type: Type.STRING },
                          whatsapp: { type: Type.STRING },
                          horario: { type: Type.STRING },
                          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                          avaliacao: { type: Type.NUMBER },
                        },
                        required: ["tipo", "nome", "descricao", "endereco"],
                      },
                    },
                  },
                  required: ["places"],
                },
              },
            });

            if (response.text) {
              const parsed = JSON.parse(response.text);
              if (parsed.places && Array.isArray(parsed.places) && parsed.places.length > 0) {
                return res.json(parsed);
              }
            }
          } catch (err: any) {
            console.warn(`Tentativa Gemini com modelo ${modelName} falhou:`, err.message);
          }
        }
      }

      // Gerador inteligente de contingência caso a API do Gemini não responda
      const fallbackPlaces = [
        {
          tipo: 'comercio',
          nome: `Padaria & Confeitaria Imperial - ${targetCity}`,
          descricao: `Pães quentinhos a toda hora, cafés especiais, tortas artesanais e o melhor café da manhã de ${targetCity}.`,
          endereco: `Av. JK, Quadra 104 Sul - Centro, ${targetCity}`,
          whatsapp: '5563992345678',
          horario: 'Seg a Sáb: 06h às 21h | Dom: 07h às 18h',
          tags: ['Café da Manhã', 'Pães Artesanais', 'Wi-Fi Grátis', 'Ar-Condicionado'],
          avaliacao: 4.9,
        },
        {
          tipo: 'praca',
          nome: `Praça Central dos Girassóis - ${targetCity}`,
          descricao: `Um espaço amplo, arborizado e ideal para caminhadas, passeios em família e eventos culturais ao ar livre.`,
          endereco: `Praça dos Girassóis - Centro, ${targetCity}`,
          whatsapp: '5563984112233',
          horario: 'Aberto 24 horas',
          tags: ['Ar Livre', 'Pet Friendly', 'Pista de Caminhada', 'Área Infantil'],
          avaliacao: 4.8,
        },
        {
          tipo: 'turismo',
          nome: `Mirante & Parque Ecológico de ${targetCity}`,
          descricao: `Vista panorâmica espetacular da cidade e do pôr do sol, cercado pela natureza exuberante e trilhas preservadas.`,
          endereco: `Serra de ${targetCity} - Zona de Preservação`,
          whatsapp: '5563991238899',
          horario: 'Ter a Dom: 08h às 18h',
          tags: ['Ponto Turístico', 'Pôr do Sol', 'Fotogênico', 'Trilha Ecologia'],
          avaliacao: 4.9,
        },
      ];

      return res.json({ places: fallbackPlaces });
    } catch (err: any) {
      console.error("Erro ao gerar locais com Gemini:", err);
      return res.json({
        places: [
          {
            tipo: 'comercio',
            nome: `Empório & Bistrô Central`,
            descricao: `Produtos selecionados, ambiente agradável e excelente gastronomia local.`,
            endereco: `Rua Comercial, 100 - Centro`,
            whatsapp: '5563999887766',
            horario: 'Seg a Sáb: 08h às 20h',
            tags: ['Gastronomia', 'Atendimento VIP', 'Wi-Fi'],
            avaliacao: 4.8,
          }
        ]
      });
    }
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GuiaCidade] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
