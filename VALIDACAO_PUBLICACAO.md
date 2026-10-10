# Revisao de publicacao e clone - 10/10/2026

## Escopo e resultado

Clone limpo obtido do GitHub no commit `c82985bc61164b1ea76b7e259f5bbe8aa26d2893`, sem copiar node_modules ou .env da maquina de desenvolvimento. Esta revisao nao certifica seguranca do Firebase remoto, direitos de imagem ou funcionamento em todo dispositivo.

### Credenciais e historico

- Revisados 12 commits e 197 blobs distintos, com scanner local de assinaturas e critico independente em modo leitura.
- Nao identificados padroes de chave privada, conta de servico com private_key, token privado GitHub/Google OAuth/AWS/Slack/Stripe, URL com senha ou URL bearer de download nas verificacoes delimitadas.
- Nenhum .env real no historico inspecionado. Arquivos locais, documentos academicos, APKs, logs, dados de testes e dependencias nao estao na arvore publicada; fixtures sinteticas de teste do backend estao versionadas.
- O historico contem configuracao publica Firebase, e-mail generico admin@admin.com e uma senha mascarada no README antigo. Nao confundir identificadores publicos com autorizacao. Restricoes da chave e Rules implantadas precisam de revisao pelo proprietario Google.
- Literais password/secret/weak nos testes sao dados artificiais de rejeicao/privacidade, nao credenciais usadas para login remoto.
- Imagens atuais (nove assets raster) sem campos EXIF, inclusive GPS. Logos, fotos, endereco e textos institucionais permanecem como parte do aplicativo; direitos de uso e consentimentos nao foram juridicamente auditados. Metadados de autoria dos commits continuam no historico.
- Nenhuma limpeza destrutiva do historico, revogacao de chave ou alteracao do Firebase foi realizada.

### Reproducibilidade

| Verificacao no clone | Resultado |
| --- | --- |
| npm ci, Node22, configuracao .npmrc do repositorio | PASS: 974 pacotes; arvore Git sem mudancas |
| Lockfile comparado como objeto Git, descontando CRLF/LF | Identico: 92b7d5ed63ae428b7d41c202c13ae19b3875a5a2 |
| Dependencias principais | Expo54.0.37 / React19.1.4 / RN0.81.6 |
| Adaptadores vendor | Resolvidos dentro do node_modules do proprio clone |
| Testes backend puros/process guards | PASS: 58/58 em Node22 |
| Expo export web | PASS: 1060 modulos, 25 assets |
| Expo export Android | PASS: 1340 modulos, 29 assets, bundle Hermes |
| Browser da exportacao Web | Login e Home visitante renderizados; sem login/backend homologados nesta rodada |
| Configuracao ausente | Confirmado auth/invalid-api-key; clonar sozinho nao inicializa o Firebase |

Exportacoes usaram somente configuracao sintetica demo-metodista-backend e emuladores loopback, sem acesso ao projeto real. Emuladores nao foram iniciados: Home exibiu conteudo local e houve ERR_CONNECTION_REFUSED nas leituras Firestore. Isso nao foi registrado como PASS de integracao.

## Condicoes para outro PC/celular

Seguir README.md: Node22, npm ci, .env autorizado preenchido, Expo Go compativel com SDK54, rede/firewall corretos e Firebase configurado. Loopback de emulador no celular nao aponta ao PC automaticamente. Nao ha teste fisico novo em outro aparelho nesta rodada, nem IPA validado. Gerar bundle Android nao significa compilar APK ou comprovar renderizacao nativa. Conta/permissoes/admin exigem Rules e Functions implantadas e homologadas.

Publicacao de codigo nao equivale a seguranca irrestrita: auditoria de dependencias da raiz ainda tem alertas conhecidos, troca de papel Web continua pendente e homologacao nativa completa permanece necessaria.
