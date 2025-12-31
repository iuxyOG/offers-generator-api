import express from "express";
import { offersRouter } from "./modules/offers/offers.routes";

const app = express();

app.use(express.json());
app.use("/offers", offersRouter);

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Value-AI Oferta Relampago</title>
  </head>
  <body>
    <h1>Gerador de Oferta Relampago</h1>
    <p>Formulario simples para testar <code>/offers/generate</code>.</p>
    <form id="offer-form">
      <label>Nome do produto
        <input name="nome" value="Mouse Gamer" />
      </label>
      <label>Preco
        <input name="preco" type="number" step="0.01" value="99.9" />
      </label>
      <label>Categoria
        <input name="categoria" value="eletronicos" />
      </label>
      <label>Estoque
        <input name="estoque" type="number" value="8" />
      </label>
      <label>Margem (%)
        <input name="margem" type="number" value="12" />
      </label>
      <button type="submit">Gerar oferta</button>
    </form>
    <pre id="result">Resposta aparecera aqui.</pre>
    <script>
      const form = document.getElementById("offer-form");
      const result = document.getElementById("result");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());

        const payload = {
          nome: String(data.nome || ""),
          preco: Number(data.preco),
          categoria: String(data.categoria || ""),
          estoque: Number(data.estoque),
          margem: Number(data.margem),
        };

        try {
          const response = await fetch("/offers/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await response.json();
          result.textContent = JSON.stringify(json, null, 2);
        } catch (error) {
          result.textContent = "Erro ao chamar a API.";
        }
      });
    </script>
  </body>
</html>`);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export { app };
