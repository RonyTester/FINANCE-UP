# Finance - Controle Financeiro Pessoal

Uma aplicação web moderna para controle de finanças pessoais, construída com JavaScript puro e Supabase.

## 🚀 Funcionalidades

- ✨ Interface moderna e responsiva
- 🔐 Autenticação segura de usuários
- 💰 Gerenciamento de receitas e despesas
- 📊 Gráficos e análises financeiras
- 🌓 Tema claro/escuro
- 💱 Suporte a múltiplas moedas

## 🛠️ Tecnologias

- HTML5, CSS3 e JavaScript puro
- [Supabase](https://supabase.com/) - Backend e Autenticação
- [Chart.js](https://www.chartjs.org/) - Gráficos
- [Font Awesome](https://fontawesome.com/) - Ícones

## ⚙️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/finance.git
cd finance
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto
   - Adicione suas credenciais do Supabase:
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_chave_do_supabase
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 📝 Configuração do Banco de Dados

Execute os seguintes scripts SQL no seu projeto Supabase:

1. Tabela de Transações:
```sql
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  description text not null,
  amount decimal not null,
  type text not null,
  category text not null,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  constraint positive_amount check (amount != 0),
  constraint valid_type check (type in ('income', 'expense'))
);

-- Habilitar RLS
alter table transactions enable row level security;

-- Criar política de acesso
create policy "Usuários podem gerenciar apenas suas próprias transações"
on transactions for all
using (auth.uid() = user_id);
```

2. Tabela de Configurações do Usuário:
```sql
create table user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users unique,
  currency text default 'BRL',
  theme text default 'light',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  constraint valid_currency check (currency in ('BRL', 'USD', 'EUR')),
  constraint valid_theme check (theme in ('light', 'dark'))
);

-- Habilitar RLS
alter table user_settings enable row level security;

-- Criar política de acesso
create policy "Usuários podem gerenciar apenas suas próprias configurações"
on user_settings for all
using (auth.uid() = user_id);
```

## 📱 Screenshots

[Adicione screenshots do seu aplicativo aqui]

## 🤝 Contribuindo

Contribuições são sempre bem-vindas! Por favor, leia o [guia de contribuição](CONTRIBUTING.md) primeiro.

1. Faça um fork do projeto
2. Crie sua branch de feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes.

## 👏 Agradecimentos

- [Supabase](https://supabase.com/) - Por fornecer uma excelente plataforma de backend
- [Chart.js](https://www.chartjs.org/) - Pela biblioteca de gráficos
- [Font Awesome](https://fontawesome.com/) - Pelos ícones incríveis

## 📧 Contato

Seu Nome - [@seu_twitter](https://twitter.com/seu_twitter) - seu_email@email.com

Link do Projeto: [https://github.com/seu-usuario/finance](https://github.com/seu-usuario/finance)


depois
Quando terminar todas as alterações e quiser mesclar com a branch principal:
1. Vá para o GitHub no navegador
Crie um "Pull Request"
Revise as mudanças
Faça o merge
Quer começar a fazer alguma alteração específica na branch? Posso te ajudar com isso!