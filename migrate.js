import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, dirname } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Supabase
const supabaseUrl = 'https://jzamtjaxrxtbhzvdzqfq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YW10amF4cnh0Ymh6dmR6cWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNjQyNTksImV4cCI6MjA1Mzc0MDI1OX0.iGjb1X9sk5Auz3fTYAe-85vM5-xOhkFexu6onRfnW4k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
    try {
        // Ler dados do arquivo local
        const dbPath = path.join(__dirname, 'data', 'db.json');
        const data = await fs.readFile(dbPath, 'utf8');
        const localDb = JSON.parse(data);

        // Criar usuário temporário para migração
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: 'migracao@temp.com',
            password: 'senha_temporaria_123'
        });

        if (authError) throw authError;
        const userId = authData.user.id;

        // Migrar transações
        if (localDb.transactions && localDb.transactions.length > 0) {
            const transactions = localDb.transactions.map(t => ({
                ...t,
                user_id: userId
            }));

            const { error: transError } = await supabase
                .from('transactions')
                .insert(transactions);

            if (transError) throw transError;
            console.log(`✓ ${transactions.length} transações migradas`);
        }

        // Migrar configurações
        if (localDb.settings) {
            const { error: settingsError } = await supabase
                .from('user_settings')
                .insert([{
                    ...localDb.settings,
                    user_id: userId
                }]);

            if (settingsError) throw settingsError;
            console.log('✓ Configurações migradas');
        }

        console.log('\nMigração concluída com sucesso!');
        console.log('\nCredenciais temporárias:');
        console.log('Email: migracao@temp.com');
        console.log('Senha: senha_temporaria_123');
        console.log('\nPor favor, faça login e altere estas credenciais imediatamente.');

    } catch (error) {
        console.error('Erro durante a migração:', error);
    }
}

migrateData(); 