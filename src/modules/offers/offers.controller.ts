import { Request, Response } from "express";
import { errorResponse, okResponse, ApiError } from "../../shared/http/response";
import { generateOffer } from "./offers.service";
import { OfferRequest } from "./offers.types";

const parseOfferInput = (body: Request["body"]) => {
  const errors: ApiError[] = [];

  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const categoria = typeof body?.categoria === "string" ? body.categoria.trim() : "";
  const preco = Number(body?.preco);
  const estoque = Number(body?.estoque);
  const margem = Number(body?.margem);

  if (!nome) {
    errors.push({ field: "nome", message: "Nome do produto e obrigatorio." });
  }

  if (!Number.isFinite(preco) || preco <= 0) {
    errors.push({ field: "preco", message: "Preco atual deve ser maior que zero." });
  }

  if (!categoria) {
    errors.push({ field: "categoria", message: "Categoria e obrigatoria." });
  }

  if (!Number.isFinite(estoque) || estoque < 0 || !Number.isInteger(estoque)) {
    errors.push({
      field: "estoque",
      message: "Estoque deve ser um numero inteiro maior ou igual a zero.",
    });
  }

  if (!Number.isFinite(margem) || margem < 0) {
    errors.push({
      field: "margem",
      message: "Margem deve ser um numero maior ou igual a zero.",
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  const input: OfferRequest = {
    nome,
    preco,
    categoria,
    estoque,
    margem,
  };

  return { input, errors };
};

export const generateOfferHandler = (req: Request, res: Response) => {
  const { input, errors } = parseOfferInput(req.body);

  if (errors.length > 0 || !input) {
    return res.status(400).json(errorResponse(errors));
  }

  const result = generateOffer(input);

  return res.json(okResponse(result));
};
