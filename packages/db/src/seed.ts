import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  accounts,
  products,
  campaignPrices,
  automationRules,
} from './schema'

const TENANT_ID = 'tenant_dev_001'

async function seed() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const client = postgres(url)
  const db = drizzle(client)

  console.log('Seeding database...')

  // 1. Create account
  const [account] = await db
    .insert(accounts)
    .values({
      tenantId: TENANT_ID,
      nome: 'Loja Teste Shopee',
      shopeeShopId: '123456789',
      shopeeToken: 'dev-token-placeholder',
      shopeeRefreshToken: 'dev-refresh-placeholder',
      status: 'active',
    })
    .returning()

  console.log(`Account created: ${account.id} — ${account.nome}`)

  // 2. Create 10 products
  const productData = [
    { sku: 'FONE-BT-001', nome: 'Fone Bluetooth TWS Pro', custo: '45.00', precoBase: '129.90', precoMinimo: '79.90', estoque: 150 },
    { sku: 'CABO-USB-002', nome: 'Cabo USB-C 2m Nylon', custo: '8.50', precoBase: '34.90', precoMinimo: '19.90', estoque: 500 },
    { sku: 'CAPINHA-003', nome: 'Capinha iPhone 15 Silicone', custo: '12.00', precoBase: '49.90', precoMinimo: '29.90', estoque: 300 },
    { sku: 'CARREGADOR-004', nome: 'Carregador Turbo 65W GaN', custo: '55.00', precoBase: '189.90', precoMinimo: '109.90', estoque: 80 },
    { sku: 'PELICULA-005', nome: 'Película Vidro Galaxy S24', custo: '3.50', precoBase: '24.90', precoMinimo: '12.90', estoque: 1000 },
    { sku: 'MOUSE-006', nome: 'Mouse Sem Fio Ergonômico', custo: '25.00', precoBase: '79.90', precoMinimo: '49.90', estoque: 200 },
    { sku: 'TECLADO-007', nome: 'Teclado Mecânico RGB Compact', custo: '85.00', precoBase: '249.90', precoMinimo: '149.90', estoque: 45 },
    { sku: 'HUB-USB-008', nome: 'Hub USB-C 7 em 1 HDMI', custo: '40.00', precoBase: '139.90', precoMinimo: '89.90', estoque: 120 },
    { sku: 'SUPORTE-009', nome: 'Suporte Notebook Alumínio', custo: '30.00', precoBase: '99.90', precoMinimo: '59.90', estoque: 75 },
    { sku: 'WEBCAM-010', nome: 'Webcam Full HD 1080p', custo: '50.00', precoBase: '159.90', precoMinimo: '99.90', estoque: 60 },
  ]

  const insertedProducts = await db
    .insert(products)
    .values(
      productData.map((p) => ({
        tenantId: TENANT_ID,
        accountId: account.id,
        ...p,
      })),
    )
    .returning()

  console.log(`${insertedProducts.length} products created`)

  // 3. Create campaign prices for all products
  const priceData = insertedProducts.map((p) => {
    const base = parseFloat(p.precoBase)
    return {
      tenantId: TENANT_ID,
      productId: p.id,
      shopeePromo: (base * 0.85).toFixed(2),
      shopeeMin: (base * 0.75).toFixed(2),
      mlPromo: (base * 0.88).toFixed(2),
      mlMin: (base * 0.78).toFixed(2),
    }
  })

  await db.insert(campaignPrices).values(priceData)
  console.log(`${priceData.length} campaign prices created`)

  // 4. Create 2 automation rules
  const rulesData = [
    {
      tenantId: TENANT_ID,
      accountId: account.id,
      nome: 'Desconto Moderado — Eletrônicos',
      condicoesJson: { categoria: 'eletronicos' },
      acoesJson: {
        estrategia: 'MODERADA',
        descontoMax: 20,
        margemMinima: 12,
        estoqueMinimo: 10,
        taxaShopee: 12,
      },
      ativo: true,
    },
    {
      tenantId: TENANT_ID,
      accountId: account.id,
      nome: 'Flash Sale Agressiva — Acessórios',
      condicoesJson: { categoria: 'acessorios' },
      acoesJson: {
        estrategia: 'AGRESSIVA',
        descontoMax: 30,
        margemMinima: 8,
        estoqueMinimo: 50,
        taxaShopee: 12,
      },
      ativo: true,
    },
  ]

  const insertedRules = await db.insert(automationRules).values(rulesData).returning()
  console.log(`${insertedRules.length} automation rules created`)

  console.log('\nSeed complete!')
  console.log(`  Tenant: ${TENANT_ID}`)
  console.log(`  Account: ${account.id}`)
  console.log(`  Products: ${insertedProducts.length}`)
  console.log(`  Rules: ${insertedRules.length}`)

  await client.end()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
