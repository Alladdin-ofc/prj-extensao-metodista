# Igreja Metodista - Extensao Universitaria

Aplicativo React Native/Expo para a comunidade de Santana de Parnaiba. Base do desenvolvimento: commit `393741d42aa83fe0996c11671e3d09ead76c2445`, preservado como ancestral desta entrega.

## Estado atual

Implementacao local, ainda nao homologada para producao. APKs ARM64 internos foram compilados com assinatura de desenvolvimento; startup, autenticacao, Home e Perfil tiveram verificacao parcial em Android. Os demais fluxos nativos continuam pendentes. iOS foi adiado: nao ha IPA validado. Firebase remoto nao foi implantado.

## Funcionalidades presentes

- Login, visitante, cadastro, recuperacao de senha e perfil com UF e foto privada.
- Home com avisos, calendario, lista/filtros/detalhes de eventos.
- Confirmacao/cancelamento privado de presenca por ocorrencia.
- Exportacao ICS na web e calendario nativo, dependente de permissao/homologacao.
- Dizimos e ofertas com copia de PIX; nao processa pagamentos.
- Informacoes institucionais, contatos e edicao de conteudo por administradores.
- Administracao master por Cloud Functions autenticadas, auditoria e protecao do ultimo master.

Nao existe senha padrao Admin/Admin. Troca de papel na interface **web** esta pendente: Alert nativo nao funciona nessa plataforma. Listagem e backend foram verificados separadamente. Programacao local, inclusive Santa Ceia, precisa de confirmacao pela igreja.

## Stack e estrutura

Expo SDK 54, React 19.1.4, React Native 0.81.6, JavaScript, React Navigation, styled-components e Firebase JS SDK. Backend como servico: Auth, Firestore, Storage e Cloud Functions Node.js 22; nao existe servidor Express proprio.

| Caminho | Funcao |
| --- | --- |
| App.js / src/routes.js | Entrada, contexto e navegacao |
| src/pages | Login, SignIn, Register, Home, Calendar, Events, Rocket, Info, Profile, Administration |
| src/components | Controles, UF, formularios e detalhes de eventos |
| src/context | Sessao, perfil, autoridade e invalidacao de operacoes antigas |
| src/services | Firebase, eventos, presenca, avatar e calendario |
| backend | Rules, Functions, bootstrap e testes |
| assets | Identidade visual e imagens |
| vendor | Adaptadores locais de dependencias; obrigatorios no clone |
| plugins | Rede nativa exclusiva dos emuladores |

ComingSoon e legado, fora das rotas ativas.

## Executar

Use Node.js 22 e npm. Na raiz:

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Preencher .env com a configuracao autorizada.
npm.cmd run dev
```

`.npmrc` registra os flags necessarios aos adaptadores. `npm.cmd run web` abre a variante web. Expo Go depende da compatibilidade do runtime; nao comprova APK/IPA proprio.

## Repasse do Firebase

**Leia [README_FIREBASE.md](README_FIREBASE.md)** para projeto, Authentication, variaveis, banco, Storage, Rules, Functions, primeiro master e checklist. [backend/README.md](backend/README.md) detalha contratos e evidencias historicas.

Antes de EAS Build, configure as variaveis EXPO_PUBLIC_FIREBASE_* no ambiente EAS development/preview/production correspondente. Os perfis nao contem valores reais no repositorio. Assinatura, custos e publicacao precisam de aprovacao propria.

## Testes

```powershell
cd backend
npm.cmd ci --ignore-scripts
npm.cmd --prefix functions ci --ignore-scripts
npm.cmd test
npm.cmd run emulators:test
```

O runner requer Node22/JDK21; ajuste seu caminho Java Windows quando necessario. Evidencias locais anteriores: 58 testes backend, 33 Rules/emuladores e quatro transportes SDK, em suites separadas. Nao equivalem a homologacao remota ou todos os cliques nativos. `_apoio-local/` guarda evidencias privadas nao publicadas.

## Pendencias

- Homologar administracao, foto, perfil, presenca e calendario no Android; iOS depois.
- Revisar dependencias: ultima auditoria local da raiz tinha 30 alertas, sem criticos; nao e audit limpo.
- Implantar Firebase autorizado e revisar dados legados, tokens de avatar e caches antigos.
- Confirmar conteudo, contatos, horarios e PIX com a igreja.
- Configurar assinatura propria; APKs de desenvolvimento nao sao releases de loja.

Nao versionar .env, contas de servico, chaves, dumps ou dados pessoais. GitHub nao implanta Firebase nem certifica producao.
