const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'convites-digitais.html');
const backupPath = path.join(__dirname, 'frontend', 'src', 'pages', 'convites-digitais-backup.html');

console.log('Reading file:', filePath);
let originalHtml = fs.readFileSync(filePath, 'utf8');

console.log('Creating backup at:', backupPath);
fs.writeFileSync(backupPath, originalHtml, 'utf8');

// Extract header (everything before <main class="lp">)
const mainStartIndex = originalHtml.indexOf('<main class="lp">');
let header = '';
if (mainStartIndex !== -1) {
    header = originalHtml.substring(0, mainStartIndex + '<main class="lp">'.length);
} else {
    console.log('Could not find <main class="lp">, extracting up to <body>');
    const bodyStartIndex = originalHtml.indexOf('<body>');
    header = originalHtml.substring(0, bodyStartIndex + '<body>'.length);
}

// Extract footer (everything from <footer class="footer"> to end)
const footerStartIndex = originalHtml.indexOf('<footer class="footer">');
let footer = '';
if (footerStartIndex !== -1) {
    footer = originalHtml.substring(footerStartIndex);
} else {
    console.log('Could not find <footer class="footer">');
    footer = '</body></html>';
}

console.log('Building new HTML');
const novoHtml = header + `
    <!-- Estilos Especiais do Popup -->
    <style>
        .order-modal {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(5px);
            z-index: 10000;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .order-modal.show { display: flex; opacity: 1; }
        .order-modal-content {
            background: #fffdf9;
            padding: 2.5rem;
            border-radius: 20px;
            width: 90%;
            max-width: 400px;
            transform: translateY(20px);
            transition: transform 0.3s ease;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            border: 2px solid #e7d8cf;
        }
        .order-modal.show .order-modal-content { transform: translateY(0); }
        .order-modal-close {
            position: absolute;
            top: 15px; right: 15px;
            background: none; border: none;
            font-size: 1.5rem; color: #b89664;
            cursor: pointer;
        }
        .order-modal-title {
            font-family: 'Playfair Display', serif;
            font-size: 1.5rem; color: #2e4a3a;
            margin-bottom: 1rem; text-align: center;
        }
        .order-modal-desc {
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem; color: #6f836f;
            margin-bottom: 1.5rem; text-align: center;
        }
        .form-group-modal { margin-bottom: 1.2rem; }
        .form-group-modal label {
            display: block; margin-bottom: 0.5rem;
            font-family: 'Poppins', sans-serif; font-size: 0.85rem; font-weight: 600; color: #2e4a3a;
            text-align: left;
        }
        .form-group-modal input {
            width: 100%; padding: 0.8rem;
            border: 1px solid #e7d8cf; border-radius: 8px;
            font-family: 'Poppins', sans-serif; font-size: 0.9rem;
            outline: none; transition: border-color 0.3s;
            box-sizing: border-box;
        }
        .form-group-modal input:focus { border-color: #c5a059; }
        .order-submit-btn {
            width: 100%; padding: 1rem;
            background: #c5a059; color: white;
            border: none; border-radius: 8px;
            font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 1rem;
            cursor: pointer; transition: background 0.3s;
        }
        .order-submit-btn:hover { background: #b89664; }
    </style>

    <!-- ========================================== -->
    <!-- ESPAÇO PARA COLAR O HTML DA IA DO CANVA    -->
    <!-- ========================================== -->
    <div id="canva-wrapper">
        <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; background: #fdf8f0; border: 2px dashed #c5a059; margin: 2rem; border-radius: 20px;">
            <div style="text-align: center;">
                <i class="fas fa-magic" style="font-size: 3rem; color: #c5a059; margin-bottom: 1rem;"></i>
                <h1 style="font-family: 'Playfair Display', serif; color: #2e4a3a;">Espaço para o código do Canva AI</h1>
                <p style="font-family: 'Poppins', sans-serif; color: #6f836f;">Aguardando a inserção do HTML/CSS gerado.</p>
                <button class="plan-select-btn order-submit-btn" data-plan-id="teste-id" data-plan-name="Plano Premium" style="max-width: 200px; margin: 1rem auto; display: block;">Testar Botão de Plano</button>
            </div>
        </div>
    </div>
    <!-- ========================================== -->

    <!-- Modal Rápido de Pedido -->
    <div class="order-modal" id="quickOrderModal">
        <div class="order-modal-content">
            <button class="order-modal-close" onclick="closeOrderModal()">&times;</button>
            <h2 class="order-modal-title">Iniciar Pedido</h2>
            <p class="order-modal-desc">Quase lá! Insira os seus dados para iniciarmos o seu convite <strong id="modal-plan-name"></strong>.</p>
            
            <div class="form-group-modal">
                <label>Nome Completo</label>
                <input type="text" id="client-name" placeholder="Ex: João & Maria">
            </div>
            <div class="form-group-modal">
                <label>Seu WhatsApp</label>
                <input type="tel" id="client-whatsapp" placeholder="Ex: +258 84 000 0000">
            </div>
            
            <button class="order-submit-btn" onclick="submitQuickOrder()">Pedir Agora</button>
        </div>
    </div>

    <!-- Scripts de Integração -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script>
        let selectedPlanId = null;
        let selectedPlanName = null;

        function openOrderModal(planId, planName) {
            selectedPlanId = planId;
            selectedPlanName = planName;
            document.getElementById('modal-plan-name').textContent = planName;
            document.getElementById('quickOrderModal').classList.add('show');
        }

        function closeOrderModal() {
            document.getElementById('quickOrderModal').classList.remove('show');
            document.getElementById('client-name').value = '';
            document.getElementById('client-whatsapp').value = '';
        }

        document.addEventListener('click', function(e) {
            if (e.target.closest('.plan-select-btn')) {
                const btn = e.target.closest('.plan-select-btn');
                const planId = btn.getAttribute('data-plan-id');
                const planName = btn.getAttribute('data-plan-name');
                if (planId && planName) {
                    openOrderModal(planId, planName);
                }
            }
        });

        async function submitQuickOrder() {
            const name = document.getElementById('client-name').value.trim();
            const phone = document.getElementById('client-whatsapp').value.trim();

            if (!name || !phone) {
                Swal.fire('Atenção', 'Por favor, preencha nome e WhatsApp.', 'warning');
                return;
            }

            const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
            const rand = Math.floor(1000 + Math.random() * 9000);
            const orderNumber = 'INV-' + dateStr + '-' + rand;

            try {
                Swal.fire({ title: 'A processar...', allowOutsideClick: false });
                Swal.showLoading();

                const { data, error } = await window.supabase
                    .from('convite_orders')
                    .insert([
                        { 
                            order_number: orderNumber,
                            client_name: name,
                            client_phone: phone,
                            plan_id: selectedPlanId === 'teste-id' ? null : selectedPlanId,
                            plan_name: selectedPlanName,
                            status: 'pendente'
                        }
                    ]);

                if (error) throw error;

                closeOrderModal();
                Swal.fire('Sucesso!', 'O seu pedido foi recebido. Entraremos em contacto pelo WhatsApp em breve.', 'success');

            } catch (error) {
                console.error(error);
                Swal.fire('Erro', 'Ocorreu um erro ao enviar o pedido. Tente novamente.', 'error');
            }
        }
    </script>
</main>
` + footer;

console.log('Writing new HTML');
fs.writeFileSync(filePath, novoHtml, 'utf8');

console.log('Process completed successfully!');
