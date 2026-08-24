# Habit

Aplicativo de rotina com humor, hábitos, tarefas, estudos, dieta, treinos e Pomodoro.

## Rodar como web

Abra `pages/login.html` no navegador. Os dados do protótipo ficam no `localStorage`.

## Preparar o APK Android

Pré-requisitos: Node.js, Android Studio e Android SDK.

```bash
npm install
npx cap add android
npm run sync:android
npm run open:android
```

No Android Studio, use **Build > Generate App Bundles or APKs > Generate APK**.

O identificador do app é `com.habit.app`.

## Dados online

O arquivo `supabase/schema.sql` cria as tabelas e políticas para uma versão multiusuário. Para colocar dados online:

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Configure o cliente Supabase no app com a URL e a chave pública do projeto.
4. Substitua os adaptadores atuais de `localStorage` por chamadas autenticadas ao Supabase.

A chave `service_role` nunca deve ser colocada no HTML, JavaScript do navegador ou APK.
