# Repasse Firebase: o que o responsavel precisa fazer

Este guia acompanha o codigo atual. Publicar o repositorio nao configura nem implanta recursos Google. Nenhum comando de nuvem abaixo foi executado nesta entrega. Execute-os somente com projeto, conta, custos e mudancas aprovados pelo responsavel.

## 1. Projeto e ambientes

1. Confirmar ID do projeto e conta proprietaria. Preferir homologacao separada de producao.
2. Aprovar faturamento, quotas e alertas de custo para Functions/Storage antes de habilitar recursos. Alertas nao devem ser tratados como teto garantido de gastos.
3. Registrar um aplicativo **Web** no Firebase: este React Native usa Firebase JS SDK e sua configuracao Web, nao React Native Firebase nativo.
4. Criar Firestore no banco `(default)`, em modo nativo, e confirmar localizacao e necessidades de dados antes da criacao. As Functions deste codigo usam `southamerica-east1`.
5. Criar/confirmar bucket Storage e copiar seu nome real; nao presumir sufixo `.appspot.com`.
6. Definir administradores do projeto via IAM com minimo privilegio. Papel master do app nao e administrador IAM do Google Cloud.

[Guia oficial de Storage](https://firebase.google.com/docs/storage/web/start): conferir os requisitos atuais de faturamento e criacao do bucket. Nao ativar cobranca automaticamente.

## 2. Authentication

- Habilitar Email/Password em Authentication > Sign-in method.
- Revisar politica de senha e templates de recuperacao, remetente e dominios autorizados quando usar web/links de retorno.
- Criar o primeiro administrador como **conta normal**, com senha forte e UID conhecido. Nunca usar Admin/Admin ou senha compartilhada em producao.
- Cadastro e recuperacao usam Authentication; `users/{uid}` e apenas o perfil complementar.
- Visitantes nao precisam criar conta para ler eventos, avisos e informacoes publicas.
- Definir procedimento de exclusao de conta e seus dados; excluir Auth nao apaga automaticamente perfil, presencas ou avatar, e nao deve quebrar a contagem de masters.

## 3. Variaveis de ambiente do aplicativo

Copiar `.env.example` para `.env`, preencher somente com a configuracao do app Web autorizado e reiniciar Metro. As variaveis sao lidas em `src/services/firebaseConfig.js`:

| Variavel | Origem/uso |
| --- | --- |
| EXPO_PUBLIC_FIREBASE_API_KEY | Configuracao Web Firebase |
| EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN | Configuracao Web Firebase |
| EXPO_PUBLIC_FIREBASE_PROJECT_ID | ID exato do projeto |
| EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET | Nome exato do bucket |
| EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Configuracao Web Firebase |
| EXPO_PUBLIC_FIREBASE_APP_ID | App ID Web |
| EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID | Opcional; Analytics nao e inicializado |
| EXPO_PUBLIC_FIREBASE_EMULATORS | 0 no remoto; 1 somente com demo-metodista-backend |

EXPO_PUBLIC_* entra no bundle e nao e um cofre de segredos. Nunca colocar senha de usuario, chave privada, ADC ou token Admin nessas variaveis. Autoridade depende de Auth/Rules/Functions, nao de esconder configuracao publica.

Para EAS, cadastrar esses valores no ambiente selecionado pelo perfil em `eas.json`. `.env` nao sera publicado. Alteracoes de valores compilados exigem nova build/atualizacao apropriada e revalidacao. Nao colocar credenciais reais no Git.

## 4. Banco: colecoes e documentos

Nao criar colecoes vazias artificialmente; Firestore cria caminhos na primeira escrita. Preparar conteudos publicos reais com o responsavel pela igreja, sem fixtures QA.

| Caminho | Conteudo e tipos | Acesso/consumidor |
| --- | --- | --- |
| users/{uid} | name/email/createdAt obrigatorios; demais campos pessoais opcionais | Dono; Register/Profile/AuthContext. createdAt ISO UTC string, imutavel |
| users/{uid}/attendance/{eventId} | eventId/title/date/time/status/confirmedAt | Dono; detalhes dos eventos. date YYYY-MM-DD, time HH:mm ou vazio, confirmedAt timestamp de servidor |
| events/{id} | title, description, date, time, category, type, createdAt; imageUrl opcional | Leitura publica Home/Calendar/Events; escrita admin/master |
| news/{id} | message, publishDate, priority | Home; publico para leitura, admin/master para escrita |
| config/info | history, about, mission, pastorText | Info; textos publicos, admin/master altera |
| config/pix | key, label | Rocket; leitura publica, admin/master altera |
| adminRoles/{uid} | role admin/master, updatedAt, updatedBy | Cliente le apenas seu registro; escrita exclusivamente backend |
| adminMetadata/roles | masterCount, updatedAt, updatedBy | Backend somente |
| adminAudit/{id} | actorUid, targetUid, before, after, at, bootstrap | Backend somente; definir retencao/acesso operacional |

Perfil aceita `name`, `email`, `dateOfBirth`, `phone`, `phoneType`, `address`, `city`, `state`, `postalCode`, `avatarUrl`, `avatarPath`, `createdAt`. Conferir limites em `backend/firestore.rules`. `avatarUrl` e compatibilidade legada, nao caminho recomendado para novas fotos. Papel nao deve ser gravado em users nem concedido por e-mail/custom claims.

Eventos: date/createdAt em ISO UTC com milissegundos (`2026-10-10T22:00:00.000Z`), time HH:mm, category `eventos|cultos|escola`, type `special` para eventos e `fixed` para as demais categorias. Conversao de horario usa America/Sao_Paulo no cliente. Avisos usam publishDate ISO UTC e priority `normal|high`.

Info pode iniciar com subconjunto nao vazio dos quatro campos. PIX deve conter key/label nao vazios, confirmados pela igreja. Nao inserir chave demonstrativa no projeto real. Presenca usa ID de ocorrencia seguro `program-...` ou `remote-...`, status `confirmed|cancelled` e timestamp servidor; cancelar grava status, nao implica apagar o documento.

## 5. Rules e indices

Revisar `backend/firestore.rules` e `backend/storage.rules` antes de publicar. Nao usar modo teste aberto. Caminhos nao reconhecidos sao negados; perfis e presencas sao privados; eventos/avisos/configuracoes citadas sao publicos. Cadastro nao pode se autopromover.

Deploy substitui regras ativas: se o projeto atende outros aplicativos, revisar/mesclar os caminhos autorizados antes. Fazer backup/mapeamento de dados legados; perfis sem createdAt ou fora do schema podem exigir migracao privilegiada separada.

Nao existe arquivo de indices compostos no repositorio. As consultas atuais usam ordenacao simples; conferir indices de campo para `events.date` e `news.publishDate`. Se Firebase exigir indice adicional, revisar a consulta e criar o indice solicitado no projeto correto; nao prometer que qualquer filtro futuro dispensa indice.

## 6. Storage: fotos privadas

- Caminho canonico: `avatars/{uid}.jpg`, apesar de o conteudo aceito poder ser JPEG/PNG/WebP.
- Dono autenticado pode ler/gravar/remover seu objeto; listagem e outros caminhos negados.
- Upload nao vazio de ate 5 MiB, MIME image/jpeg, image/png ou image/webp. MIME nao substitui validacao de conteudo.
- Cliente salva avatarPath e busca bytes autenticados; nao publicar URL bearer como nova foto.
- URLs antigas com download token continuam acessiveis a quem possui o link. Rules nao revogam esses tokens: revisar migracao e revogacao com autorizacao especifica, sem executar limpeza destrutiva automaticamente.
- Se houver homologacao web, testar CORS do bucket para as origens autorizadas e leitura autenticada real. Nao liberar wildcard sem analise.

## 7. Cloud Functions e primeiro master

Codigo em `backend/functions`, runtime Node.js 22, regiao `southamerica-east1`, codebase `administration`. Callables v2:

- `listMembersForAdministration({pageSize?, pageToken?})`: master somente, retorna uid/name/email/role e cursor. Usa Auth como diretorio, inclusive contas sem perfil; nao retorna hashes, tokens ou dados pessoais completos.
- `setMemberRole({uid, role})`: master somente; role member/admin/master. Auditoria e contagem transacionais impedem remover o ultimo master. Member nao tem documento adminRoles.

Nao conceder acesso privilegiado escrevendo documento manual isolado: registro/contagem/auditoria devem permanecer consistentes. Nao excluir master fora do procedimento operacional. Revisar IAM da identidade de execucao para Auth user-read e transacoes Firestore; nao conceder exportacao de hashes de senha. App Check nao esta implementado/exigido neste codigo: planejar integracao e homologacao antes de ativar enforcement.

Com Node22, na raiz:

```powershell
npm.cmd --prefix backend ci --ignore-scripts
npm.cmd --prefix backend/functions ci --ignore-scripts
npm.cmd --prefix backend test
```

Somente operador autorizado, apos testes/backup/revisao de custos, na pasta backend, autenticado com permissao no **projeto aprovado**:

```powershell
# Substituir ID_APROVADO; nao executar com placeholders.
node node_modules/firebase-tools/lib/bin/firebase.js deploy --project ID_APROVADO --config firebase.json --only functions:administration,firestore:rules,storage
```

Primeiro master: obter UID da conta Auth existente, configurar ADC seguro fora do repositorio e usar shell separado sem variaveis de emulador. Nao baixar/commitar chave de conta de servico. Com aprovacao explicita para escrita remota, na pasta backend:

```powershell
node functions/scripts/bootstrap-master.js --uid UID_APROVADO --project ID_APROVADO --allow-cloud
```

Bootstrap cria role master, masterCount e auditoria em transacao; recusa registro legado parcialmente inicializado. Mesma conta e idempotente. Depois usar callable para promover outros cadastrados. Flag --allow-cloud e trava tecnica, nao substitui autorizacao humana.

## 8. Tempo real e persistencia

`onSnapshot` atualiza eventos, avisos, configuracoes, papel e presenca. Firestore usa memoryLocalCache nas plataformas; nao ha promessa de persistencia offline completa. Auth nativo persiste sessao via AsyncStorage separadamente. Logout nao apaga automaticamente caches persistentes de versoes antigas. Planejar migracao em dispositivos compartilhados se houver dados legados.

Sem Functions implantadas o painel master nao consegue listar/promover usuarios. Sem Rules adequadas interfaces podem aparecer mas escritas devem falhar. Cadastro Auth e perfil Firestore nao sao transacao unica; testar recuperacao de perfil incompleto e divergencia de e-mail.

## 9. Checklist de homologacao e entrega do responsavel

- [ ] Confirmar ID/proprietario/localizacao/bucket/plano, IAM e alertas de custo.
- [ ] Habilitar Email/Password e validar cadastro, login, logout e recuperacao.
- [ ] Configurar .env local e ambientes EAS, sem credenciais Admin no app.
- [ ] Revisar legado, Rules, indices, CORS e politica de privacidade/retencao.
- [ ] Implantar duas Functions e Rules; registrar versao/commit/data/projeto.
- [ ] Inicializar primeiro master com UID seguro e conferir contagem/auditoria.
- [ ] Provar que membro nao altera papel, publico nao grava conteudo e usuario nao le perfil/foto/presenca alheia.
- [ ] Promover/revogar outro master e tentar remover ultimo master; verificar servidor e interface.
- [ ] Publicar aviso/evento/info/PIX reais e observar atualizacao em outra sessao/visitante.
- [ ] Confirmar/cancelar presenca com ACK, testar falha de rede e troca de usuario.
- [ ] Enviar/ler foto privada, testar limites e sessao encerrada.
- [ ] Completar homologacao nativa Android; iOS permanece pendente. Troca de papel na UI Web requer correcao propria.
- [ ] Entregar configuracao Web por canal seguro, UIDs de operadores autorizados, resultado dos testes e plano de rollback. Nunca enviar senhas/chaves em GitHub.

## Referencias

- [Publicacao e gerenciamento de Rules](https://firebase.google.com/docs/rules/manage-deploy)
- [Storage e requisitos de configuracao](https://firebase.google.com/docs/storage/web/start)
- [Callables autenticadas](https://firebase.google.com/docs/functions/callable)
- [Transacoes Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)

Contrato final: fontes e Rules do repositorio prevalecem sobre exemplos. Nao afirmar producao aprovada com base apenas em testes locais.
