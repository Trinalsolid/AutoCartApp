# AutoCartApp / AutoCartAppCarrinho

Este repositório contém os dois projetos do AutoCart:  

- **AutoCartApp** → versão principal do aplicativo para usuário
- **AutoCartAppCarrinho** → versão do carrinho / 

---

## Pré-requisitos

Antes de rodar os projetos, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/)
- NPM ou Yarn
- [Capacitor](https://capacitorjs.com/) (instalado globalmente ou via `npx`)
- [Android Studio](https://developer.android.com/studio) (para rodar a versão Android)
- Git

---

## Configuração inicial no Windows

Caso o PowerShell bloqueie a execução de scripts, rode:

````powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
````

Rodando os projetos.<br>
1️⃣ Sincronizar arquivos com Capacitor

Para cada projeto (AutoCartApp ou AutoCartAppCarrinho), execute:

2️⃣ Entrar na pasta do projeto

````powershell
cd AutoCartApp
````
ou
````powershell
cd AutoCartAppCarrinho
````

3️⃣ Instalar o Capacitor
````powershell
npm install @capacitor/core @capacitor/cli --save-dev
````

4️⃣ Sincronizar e ebrir projeto no Android Studio

````powershell
cd AutoCartApp         # ou AutoCartAppCarrinho
npx cap sync
npx cap open android
````

---

Isso abrirá o projeto no Android Studio para rodar o app em emulador ou dispositivo físico.

Estrutura do repositório
AutoCartRepo/
├── AutoCartApp/          # Projeto principal
├── AutoCartAppCarrinho/  # Projeto do carrinho
.gitignore
README.md

Observações

Ambos os projetos podem ser rodados separadamente, mas compartilham algumas dependências.
Arquivos como node_modules/ e builds são ignorados pelo Git (.gitignore).
Use a branch AutoCart-Alfa-1.1 para desenvolvimento e testes antes de integrar à main.

**⚠️ Observação importante:** Sempre execute `npx cap sync` antes de abrir o projeto no Android Studio..<br>
**⚠️ Observação importante:** Função de adicionar produto ao carrinho não está funcionando 100%, por favor verificar e testar ela, 
infelizmente não consegui resolver o problema, sem falar que ainda precisa de integração, com o app do usário e do carrinho.
