Offers Generator API (Alpha)

API backend desenvolvida em Node.js + TypeScript para geração e validação de ofertas promocionais, aplicando regras de negócio e retornando alertas operacionais de forma padronizada.

Projeto em estágio Alpha, criado com foco em arquitetura limpa, boas práticas e evolução futura.

📌 Visão geral

O objetivo deste projeto é auxiliar na criação de ofertas promocionais, reduzindo erros manuais e padronizando decisões através de regras simples, gerando:

Título da oferta

Descrição promocional

Checklist de validação

Alertas de risco (estoque, margem, categoria)

O projeto não depende de APIs externas e pode ser adaptado para diferentes contextos de e-commerce ou sistemas internos.

🚧 Status do projeto

Versão: Alpha

Autenticação: ❌ Não implementada

Banco de dados: ❌ Não utilizado

IA externa: ❌ Mock preparado

Objetivo: Estudo, portfólio e validação de arquitetura

🧱 Arquitetura

Arquitetura modular, organizada por domínio, preparada para crescimento.

.
├── package.json
├── tsconfig.json
└── src
    ├── app.ts
    ├── server.ts
    ├── shared
    │   └── http
    │       └── response.ts
    └── modules
        └── offers
            ├── offers.controller.ts
            ├── offers.routes.ts
            ├── offers.service.ts
            ├── offers.prompt.ts
            └── offers.types.ts

Organização dos módulos

Controller: validação de entrada e resposta

Service: regras de negócio

Prompt: centralização da lógica de geração de texto

Types: contratos tipados

Shared: utilitários reutilizáveis

🔁 Fluxo da aplicação

Cliente envia uma requisição HTTP

Controller valida os dados obrigatórios

Service aplica regras de negócio

API retorna resposta padronizada com:

conteúdo gerado

checklist

alertas

🔗 Endpoint disponível
POST /offers/generate
Payload de exemplo
{
  "nome": "Mouse Gamer",
  "preco": 99.9,
  "categoria": "eletronicos",
  "estoque": 8,
  "margem": 12
}

Resposta de exemplo
{
  "success": true,
  "data": {
    "titulo": "Oferta Promocional: Mouse Gamer por R$ 99.90",
    "descricao": "Descrição gerada automaticamente",
    "checklist": ["..."],
    "alertas": ["..."]
  }
}

🛠️ Tecnologias utilizadas

Node.js

TypeScript

Express

Arquitetura modular

Padrão Controller / Service

▶️ Como executar localmente
Instalação
npm install

Desenvolvimento
npm run dev

Build e execução
npm run build
npm start

🔒 Observações

Projeto sem automações externas

Nenhuma credencial sensível

Código voltado para estudo e evolução

Estrutura preparada para testes, IA real e front-end futuro

🔜 Próximos passos planejados

Testes unitários do módulo Offers

Regras de negócio por categoria

Endpoint de preview

Integração com IA real

Interface web para demonstração

👤 Autor

Iury Henrique Nascimento de Almeida
Desenvolvedor de Software focado em automação, backend e produtos digitais
