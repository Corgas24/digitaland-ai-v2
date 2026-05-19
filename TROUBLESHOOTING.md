# Digitaland AI — Troubleshooting: Supabase 404 Error

## Erro
```
404: NOT_FOUND
Code: NOT_FOUND
ID: cdg1::6vbj5-1779163088485-67004845236c
```

## Causa mais provável

Função Edge do Supabase não implantada / desincronizada.

O Supabase Edge Functions só está disponível quando as funções locais em
`supabase/functions/` são explicitamente implantadas no projeto Supabase remoto.
Apenas ter os arquivos localmente não basta — use o Supabase CLI para sincronizar.

## Diagnóstico rápido

1. Abra o **DevTools (F12) → Network**
2. Filtrar por **404**
3. Recarregue a página
4. Veja qual URL está retornando 404 — a URL aparecerá na coluna **Name**

Se a URL for algo como:
```
https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/create-stripe-session
```
→ A função `create-stripe-session` não está implantada no Supabase.

Se a URL for algo como:
```
https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway
```
→ O gateway precisa ser reimplantado.

## Correção: reimplantar todas as Edge Functions

```bash
cd supabase

# Fazer login no Supabase (se ainda não estiver logado)
npx supabase login

# Vincular ao projeto (se ainda não estiver vinculado)
npx supabase link --project-ref fycqiwfbhqbltsthrpxk

# Implantar TODAS as funções de uma vez
npx supabase functions deploy --no-verify-jwt

# Ou implantar uma por uma:
npx supabase functions deploy gateway
npx supabase functions deploy create-stripe-session
npx supabase functions deploy stripe-webhook
```

## Se o erro for de tabelas/colunas faltando (PGRST202/PGRST204)

O gateway tenta ler das tabelas `profiles`, `models`, `logs`.
Se alguma não existir, ele retorna 404. Implante as migrações pendentes:

```bash
npx supabase db push
```

## Variáveis de ambiente necessárias no Supabase Edge Functions

No Supabase Dashboard → Edge Functions → [cada função] → Secrets, verifique:

```
UPSTREAM_API_KEY        = sua chave da CrazyRouter
UPSTREAM_API_URL        = https://crazyrouter.com/v1/chat/completions
FALLBACK_API_KEY        = sua chave OpenRouter (opcional)
STRIPE_SECRET_KEY       = sk_live_...           (para create-stripe-session)
STRIPE_WEBHOOK_SECRET   = whsec_...             (para stripe-webhook)
GATEWAY_BILLING_EXEMPT_USER_ID = (se usar isenção)
MINIMUM_CHARGE          = 0.001                (piso por requisição)
```

## Após corrigir

1. Recarregue a página com cache limpo (Ctrl+Shift+R)
2. Se o erro persistir, abra o DevTools → Network → 404 e me envie o nome da URL que está falhando.
