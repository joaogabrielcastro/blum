# 🏢 BLUM - Sistema de Gestão Comercial

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Sistema completo de gestão comercial para atacado, desenvolvido com React e Node.js, com foco em controle de estoque, pedidos, comissões e relatórios de vendas.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Como Usar](#como-usar)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Usuários e Permissões](#usuários-e-permissões)
- [Screenshots](#screenshots)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

## 🎯 Sobre o Projeto

O **BLUM** é um sistema de gestão comercial desenvolvido para facilitar o gerenciamento de um atacado em Curitiba. O sistema oferece controle completo de produtos, clientes, pedidos e comissões, com interface intuitiva e responsiva.

### Principais Diferenciais:

- 🤖 **Importação Inteligente**: Upload de PDF/CSV com extração automática via IA (Gemini)
- 📊 **Relatórios Dinâmicos**: Gráficos e estatísticas em tempo real
- 💼 **Sistema de Comissões**: Controle automático de comissões por representada
- 📱 **Responsivo**: Interface adaptada para mobile, tablet e desktop
- 🔐 **Controle de Acesso**: Permissões diferenciadas para admin e vendedores
- 📈 **Histórico de Preços**: Rastreamento completo de alterações de preços

## ✨ Funcionalidades

### Para Todos os Usuários:
- ✅ Dashboard com estatísticas personalizadas
- ✅ Gerenciamento de clientes (CRUD completo)
- ✅ Catálogo de produtos com busca avançada
- ✅ Criação e edição de pedidos
- ✅ Histórico de pedidos por cliente
- ✅ Relatórios de vendas e comissões
- ✅ Geração de PDF de pedidos
- ✅ Controle de estoque com alertas

### Apenas para Administradores:
- 🔐 Importação de produtos via PDF/CSV
- 🔐 Gerenciamento de representadas
- 🔐 Configuração de taxas de comissão
- 🔐 Exclusão de produtos
- 🔐 Histórico de preços dos produtos
- 🔐 Visualização de todos os pedidos (global)

## 🚀 Tecnologias

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Neon Database** - PostgreSQL serverless
- **Multer** - Upload de arquivos
- **pdf-parse** - Processamento de PDFs
- **Google Generative AI** - Extração inteligente de dados

### Frontend
- **React 18** - Biblioteca JavaScript
- **Tailwind CSS** - Framework CSS utilitário
- **Recharts** - Biblioteca de gráficos
- **jsPDF** - Geração de PDFs
- **React Router** - Navegação

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 16 ou superior)
- **npm** ou **yarn**
- Conta no **Neon Database** (ou PostgreSQL local)
- **API Key do Google Gemini** (opcional, para importação via IA)

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/joaogabrielcastro/blum.git
cd blum
```

### 2. Instale as dependências do Backend

```bash
cd blum_backend
npm install
```

### 3. Instale as dependências do Frontend

```bash
cd ../blum_frontend
npm install
```

## ⚙️ Configuração

### Backend

1. Crie um arquivo `.env` na pasta `blum_backend/`:

```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@host/database

# Servidor
PORT=3000
NODE_ENV=development

# IA (Opcional - para importação inteligente)
GEMINI_API_KEY=sua_chave_api_gemini
```

2. Configure sua conexão com o **Neon Database**:
   - Acesse [neon.tech](https://neon.tech)
   - Crie um novo projeto
   - Copie a connection string
   - Cole no `DATABASE_URL`

### Frontend

O frontend está configurado para se conectar ao backend em `http://localhost:3000`. Se necessário, altere em:

```javascript
// src/services/apiService.jsx
const API_URL = "http://localhost:3000/api/v1";
```

## 🎮 Como Usar

### Inicie o Backend

```bash
cd blum_backend
npm start
```

O servidor estará disponível em: `http://localhost:3000`

### Inicie o Frontend

```bash
cd blum_frontend
npm start
```

A aplicação abrirá automaticamente em: `http://localhost:3001`

### Primeiro Acesso

Use uma das credenciais padrão:

| Usuário | Senha | Tipo | Acesso |
|---------|-------|------|--------|
| admin | 123 | Administrador | Completo |
| siane | 123 | Vendedor | Limitado |
| eduardo | 123 | Vendedor | Limitado |
| vendedor | 123 | Vendedor | Limitado |

> ⚠️ **IMPORTANTE**: Altere as senhas padrão em produção!

## 📁 Estrutura do Projeto

```
blum/
├── blum_backend/                 # Backend Node.js
│   ├── src/
│   │   ├── controllers/         # Lógica de negócio
│   │   │   ├── brandController.js
│   │   │   ├── clientController.js
│   │   │   ├── orderController.js
│   │   │   ├── productController.js
│   │   │   ├── purchaseController.js
│   │   │   └── reportController.js
│   │   ├── routes/              # Rotas da API
│   │   │   ├── brandRoutes.js
│   │   │   ├── clientRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── purchaseRoutes.js
│   │   │   └── reportRoutes.js
│   │   └── middleware/          # Middlewares
│   │       └── upload.js        # Configuração Multer
│   ├── index.js                 # Entrada do servidor
│   ├── package.json
│   └── .env                     # Variáveis de ambiente
│
└── blum_frontend/               # Frontend React
    ├── public/
    │   ├── images/              # Logos e imagens
    │   └── index.html
    ├── src/
    │   ├── Pages/               # Páginas principais
    │   │   ├── Dashboard.jsx
    │   │   ├── ProductsPage.jsx
    │   │   ├── ClientsPage.jsx
    │   │   ├── OrdersPage.jsx
    │   │   ├── PurchasesPage.jsx
    │   │   ├── ReportsPage.jsx
    │   │   └── ClientHistoryPage.jsx
    │   ├── components/          # Componentes reutilizáveis
    │   │   ├── Login.jsx
    │   │   ├── Sidebar.jsx
    │   │   ├── ProductRow.jsx
    │   │   ├── ProductsForm.jsx
    │   │   ├── OrdersForm.jsx
    │   │   ├── ClientsForm.jsx
    │   │   ├── BrandForm.jsx
    │   │   ├── FilterBar.jsx
    │   │   ├── SalesChart.jsx
    │   │   ├── PdfGenerator.jsx
    │   │   └── ...
    │   ├── services/
    │   │   └── apiService.jsx   # Comunicação com API
    │   ├── utils/
    │   │   └── format.js        # Funções auxiliares
    │   ├── App.jsx              # Componente principal
    │   ├── index.js             # Entrada React
    │   └── index.css            # Estilos globais
    ├── package.json
    └── tailwind.config.js       # Config Tailwind
```

## 🔌 API Endpoints

### Clientes
```
GET    /api/v1/clients          # Listar clientes
POST   /api/v1/clients          # Criar cliente
PUT    /api/v1/clients/:id      # Atualizar cliente
DELETE /api/v1/clients/:id      # Deletar cliente
```

### Produtos
```
GET    /api/v1/products         # Listar produtos
GET    /api/v1/products/search  # Buscar produtos
POST   /api/v1/products         # Criar produto
PUT    /api/v1/products/:id     # Atualizar produto
DELETE /api/v1/products/:id     # Deletar produto
```

### Pedidos
```
GET    /api/v1/orders                    # Listar pedidos
GET    /api/v1/orders/seller/:userId     # Pedidos por vendedor
POST   /api/v1/orders                    # Criar pedido
PUT    /api/v1/orders/:id                # Atualizar pedido
PUT    /api/v1/orders/:id/status         # Atualizar status
DELETE /api/v1/orders/:id                # Deletar pedido
```

### Representadas (Brands)
```
GET    /api/v1/brands           # Listar representadas
POST   /api/v1/brands           # Criar representada
PUT    /api/v1/brands/:name     # Atualizar representada
DELETE /api/v1/brands/:name     # Deletar representada
```

### Compras (Purchase)
```
POST   /api/v1/purchases/process-pdf     # Processar PDF
POST   /api/v1/purchases/process-csv     # Processar CSV
POST   /api/v1/purchases/finalize-pdf    # Finalizar importação PDF
POST   /api/v1/purchases/finalize-csv    # Finalizar importação CSV
GET    /api/v1/purchases/price-history/:id  # Histórico de preços
```

### Relatórios
```
GET    /api/v1/reports/stats            # Estatísticas gerais
GET    /api/v1/reports/sales-by-rep     # Vendas por representante
```

### Status
```
GET    /api/v1/status                   # Status do servidor
```

## 👥 Usuários e Permissões

### Administrador (admin)
- ✅ Acesso completo a todas as funcionalidades
- ✅ Gerenciar representadas e comissões
- ✅ Importar produtos via PDF/CSV
- ✅ Ver histórico de preços
- ✅ Excluir produtos
- ✅ Ver todos os pedidos do sistema

### Vendedor (salesperson)
- ✅ Dashboard com suas estatísticas
- ✅ Gerenciar clientes
- ✅ Criar e editar pedidos
- ✅ Ver catálogo de produtos
- ✅ Gerar relatórios pessoais
- ❌ Não pode acessar página de Compras
- ❌ Não pode excluir produtos
- ❌ Não pode gerenciar representadas
- ❌ Vê apenas seus próprios pedidos

## 📸 Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Catálogo de Produtos
![Produtos](docs/screenshots/products.png)

### Criação de Pedidos
![Pedidos](docs/screenshots/orders.png)

### Relatórios
![Relatórios](docs/screenshots/reports.png)

## 🗃️ Banco de Dados

### Estrutura das Tabelas

**clients**
```sql
id           SERIAL PRIMARY KEY
companyname  VARCHAR(255) NOT NULL
contactperson VARCHAR(255)
phone        VARCHAR(255)
region       VARCHAR(255)
cnpj         VARCHAR(255)
createdat    TIMESTAMP
```

**products**
```sql
id          SERIAL PRIMARY KEY
name        VARCHAR(255) NOT NULL
productcode VARCHAR(255)
subcode     VARCHAR(255)
price       DECIMAL(10,2) NOT NULL
stock       INTEGER NOT NULL
brand       VARCHAR(255)
minstock    INTEGER DEFAULT 0
createdat   TIMESTAMP
```

**orders**
```sql
id          SERIAL PRIMARY KEY
clientid    INTEGER REFERENCES clients(id)
userid      VARCHAR(255) NOT NULL
items       JSONB
totalprice  DECIMAL(10,2) NOT NULL
discount    DECIMAL(10,2) DEFAULT 0
status      VARCHAR(50) DEFAULT 'Em aberto'
description TEXT
createdat   TIMESTAMP
finishedat  TIMESTAMP
```

**brands**
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(255) UNIQUE NOT NULL
commission_rate DECIMAL(5,2) DEFAULT 0
```

## 🤝 Contribuindo

Contribuições são sempre bem-vindas! Para contribuir:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 🐛 Reportar Bugs

Encontrou um bug? Por favor, abra uma [issue](https://github.com/joaogabrielcastro/blum/issues) com:

- Descrição detalhada do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)
- Informações do ambiente (SO, navegador, versão Node)

## 📝 Roadmap

- [ ] Adicionar sistema de notificações
- [ ] Exportar relatórios em Excel
- [ ] Upload de fotos para produtos
- [ ] Sistema de backup automático
- [ ] Integração com WhatsApp

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**João Gabriel Castro**

- GitHub: [@joaogabrielcastro](https://github.com/joaogabrielcastro)
- Email: joaowotekoski@gmail.com

---

⭐ Se este projeto te ajudou, considere dar uma estrela!

**Desenvolvido com ❤️ para BLUM Curitiba**
