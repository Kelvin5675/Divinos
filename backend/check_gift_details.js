// Script para adicionar a coluna gift_details na tabela invitations_details
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://eahrqlfdixqjwuygdkip.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaHJxbGZkaXhxand1eWdka2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2Nzg5OTgsImV4cCI6MjA4NTI1NDk5OH0.6_J6lN2BGluF8tcSIxX-BwN8sv69gN6oNhVqzoIsYxU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAndTest() {
    // Teste 1: Verificar se a coluna gift_details já existe tentando selecionar ela
    console.log("--- Teste 1: Verificar coluna gift_details ---");
    const { data, error } = await supabase
        .from('invitations_details')
        .select('invitation_id, gift_details')
        .limit(3);
    
    if (error) {
        console.log("ERRO ao selecionar gift_details:", error.message);
        console.log("Código:", error.code);
        console.log("Detalhes:", error.details);
        console.log("\n>> A coluna gift_details provavelmente NÃO EXISTE na tabela.");
        console.log(">> Execute o SQL abaixo no Supabase SQL Editor:");
        console.log(">> ALTER TABLE invitations_details ADD COLUMN IF NOT EXISTS gift_details JSONB DEFAULT NULL;");
    } else {
        console.log("Coluna gift_details EXISTE! Dados:", JSON.stringify(data, null, 2));
        
        // Teste 2: Tentar fazer um update de gift_details num registro existente
        if (data && data.length > 0) {
            const invId = data[0].invitation_id;
            console.log("\n--- Teste 2: Tentar update de gift_details para invitation_id:", invId, "---");
            
            const testConfig = {
                active: true,
                bank: { name: "FNB", account_name: "Kelvin", account_number: "193845783", nib: "002939408283502847590" },
                mobile_wallets: {
                    mpesa: { number: "84238947", name: "Kelvin Edilson" },
                    emola: { number: "869312874", name: "Kelvin Edilson" }
                }
            };
            
            const { data: upData, error: upErr } = await supabase
                .from('invitations_details')
                .update({ gift_details: testConfig })
                .eq('invitation_id', invId)
                .select();
            
            if (upErr) {
                console.log("ERRO no update:", upErr.message);
                console.log("Código:", upErr.code);
            } else {
                console.log("UPDATE sucesso! Dados atualizados:", JSON.stringify(upData, null, 2));
            }
        }
    }
}

checkAndTest().catch(console.error);
