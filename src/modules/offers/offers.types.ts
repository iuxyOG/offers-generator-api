export type OfferRequest = {
  nome: string;
  preco: number;
  categoria: string;
  estoque: number;
  margem: number;
};

export type OfferResult = {
  titulo: string;
  descricao: string;
  checklist: string[];
  alertas: string[];
};

export type OfferResponse = {
  success: true;
  data: OfferResult;
};
