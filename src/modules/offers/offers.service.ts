import { OFFER_PROMPT_BASE } from "./offers.prompt";
import { OfferRequest, OfferResult } from "./offers.types";

const formatPrice = (value: number) => value.toFixed(2);

const applyTemplate = (template: string, replacements: Record<string, string>) => {
  let output = template;
  Object.entries(replacements).forEach(([key, value]) => {
    const token = new RegExp(`{{${key}}}`, "g");
    output = output.replace(token, value);
  });
  return output;
};

// Normalize category input to match the sensitive list reliably.
const normalizeCategory = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const sensitiveCategories = new Set([
  "saude",
  "suplementos",
  "infantil",
  "beleza",
  "cosmeticos",
  "eletronicos",
  "bebes",
  "medicamentos",
]);

export const generateOffer = (input: OfferRequest): OfferResult => {
  const priceFormatted = formatPrice(input.preco);
  const normalizedCategory = normalizeCategory(input.categoria);
  const isSensitiveCategory = sensitiveCategories.has(normalizedCategory);

  const title = `Oferta Relampago: ${input.nome} por R$ ${priceFormatted} | ${input.categoria}`;

  const description = applyTemplate(OFFER_PROMPT_BASE, {
    nome: input.nome,
    categoria: input.categoria,
    preco: priceFormatted,
    estoque: String(input.estoque),
    margem: String(input.margem),
  });

  const checklist: string[] = [
    "Titulo claro com beneficio e preco",
    "Descricao com destaque de urgencia e chamada para acao",
    "Preco competitivo validado",
    "Estoque atualizado no anuncio",
    "Margem minima recomendada (>= 15%)",
  ];

  if (isSensitiveCategory) {
    checklist.push(
      "Categoria sensivel: revisar regras e restricoes da Shopee antes de publicar."
    );
  }

  const alerts: string[] = [];

  if (input.estoque < 10) {
    alerts.push("Estoque baixo: risco de ruptura durante a oferta.");
  }

  if (input.margem < 15) {
    alerts.push("Margem baixa: revisar desconto e custos do produto.");
  }

  return {
    titulo: title,
    descricao: description,
    checklist,
    alertas: alerts,
  };
};
