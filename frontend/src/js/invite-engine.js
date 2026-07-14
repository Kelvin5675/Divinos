/**
 * =========================================================================
 * DIVINOS GRAFFIC - MOTOR DE CONVITES DIGITAIS (INVITE ENGINE V2)
 * =========================================================================
 * Responsável por conectar arquivos HTML/CSS estáticos do Canva ao banco de dados Supabase.
 * Controla também a restrição dinâmica de recursos por tipo de Plano contratado (Feature Gating).
 */

class DivinosInviteEngine {
    constructor() {
        this.invitationData = null;
        this.invitationId = null;
        
        // Modal de RSVP
        this.rsvpModal = null;
        
        this.init();
    }

    async init() {
        this.setupRsvpModal();
        await this.loadInvitationData();
        this.bindDataAttributes();
        this.bindEvents();
        this.setupEnvelopeAndMusic();
        this.setupLiveStream();
    }

    // Cria e insere o modal centralizado de RSVP elegantemente na página
    setupRsvpModal() {
        const modalHTML = `
        <div id="divinos-rsvp-modal" style="display: none; position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); align-items: center; justify-content: center;">
            <div style="background: #fff; width: 90%; max-width: 450px; padding: 2.5rem; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); position: relative; font-family: sans-serif;">
                <button id="divinos-close-rsvp" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #888;">&times;</button>
                
                <h2 style="color: #c5a059; margin-bottom: 0.5rem; font-family: serif; font-size: 1.8rem; font-style: italic;">Confirmar Presença</h2>
                <p style="color: #666; margin-bottom: 2rem; font-size: 0.95rem;">Estamos muito felizes em compartilhar este momento. Por favor, confirme a sua presença abaixo.</p>
                
                <form id="divinos-rsvp-form" style="display: flex; flex-direction: column; gap: 1rem; text-align: left;">
                    <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                        <label style="font-size: 0.85rem; font-weight: 600; color: #444; text-transform: uppercase; letter-spacing: 0.05em;">Seu Nome Completo</label>
                        <input type="text" id="rsvp-name" required placeholder="Ex: João Silva" style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; outline: none; transition: border 0.3s;" onfocus="this.style.borderColor='#c5a059'" onblur="this.style.borderColor='#ddd'">
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                        <label style="font-size: 0.85rem; font-weight: 600; color: #444; text-transform: uppercase; letter-spacing: 0.05em;">Você irá ao evento?</label>
                        <div style="display: flex; gap: 1rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="radio" name="rsvp-presence" value="yes" checked style="accent-color: #c5a059;"> Sim, com certeza!
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="radio" name="rsvp-presence" value="no" style="accent-color: #c5a059;"> Infelizmente, não poderei
                            </label>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.5rem;">
                        <label style="font-size: 0.85rem; font-weight: 600; color: #444; text-transform: uppercase; letter-spacing: 0.05em;">Mensagem para os Noivos (Opcional)</label>
                        <textarea id="rsvp-msg" rows="3" placeholder="Deixe uma mensagem especial..." style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; outline: none; resize: none;"></textarea>
                    </div>

                    <button type="submit" id="divinos-rsvp-submit-btn" style="margin-top: 1rem; background: #c5a059; color: #fff; border: none; padding: 14px; border-radius: 30px; font-size: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: background 0.3s; box-shadow: 0 4px 15px rgba(197, 160, 89, 0.4);">Enviar Confirmação</button>
                </form>

                <div id="divinos-rsvp-success" style="display: none; padding: 2rem 0;">
                    <div style="color: #10B981; font-size: 3rem; margin-bottom: 1rem;">&#10004;</div>
                    <h3 style="color: #333;">Obrigado!</h3>
                    <p style="color: #666; margin-top: 0.5rem;">Sua resposta foi registrada com sucesso.</p>
                    <button id="divinos-close-success" style="margin-top: 1.5rem; background: #333; color: #fff; border: none; padding: 10px 25px; border-radius: 20px; cursor: pointer;">Fechar</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.rsvpModal = document.getElementById('divinos-rsvp-modal');

        document.getElementById('divinos-close-rsvp').addEventListener('click', () => this.hideRsvpModal());
        document.getElementById('divinos-close-success').addEventListener('click', () => this.hideRsvpModal());
        
        document.getElementById('divinos-rsvp-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitRsvp();
        });
    }

    showRsvpModal() {
        if(this.rsvpModal) {
            this.rsvpModal.style.display = 'flex';
            this.rsvpModal.style.animation = 'fadeIn 0.3s ease forwards';
        }
    }

    hideRsvpModal() {
        if(this.rsvpModal) {
            this.rsvpModal.style.display = 'none';
            // Reset state
            document.getElementById('divinos-rsvp-form').style.display = 'flex';
            document.getElementById('divinos-rsvp-success').style.display = 'none';
            document.getElementById('divinos-rsvp-form').reset();
        }
    }

    async loadInvitationData() {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        if (!slug) {
            console.error('[Divinos Engine] Slug não fornecido na URL. Preview mode.');
            return;
        }

        try {
            // Supondo que a config global window.supabaseClient existe e foi carregada do supabase-config.js
            if(!window.supabaseClient) {
                console.warn('[Divinos Engine] Cliente Supabase não encontrado. Verifique se o supabase-config.js foi importado.');
                return;
            }

            // Busca os dados da view consolidada do controller (mesma API pública)
            // No caso de requisição direta ao Supabase:
            const { data, error } = await window.supabaseClient
                .from('invitations')
                .select('*, plan:invitation_plans(*), details:invitations_details(*)')
                .eq('slug', slug)
                .single();

            if (error) throw error;
            this.invitationData = data;
            this.invitationId = data.id;

            console.log('[Divinos Engine] Convite carregado com sucesso:', data.title);
            
            // Applica o Feature Gating após carregar
            this.applyFeatureGating();

        } catch (err) {
            console.error('[Divinos Engine] Erro ao carregar convite:', err);
        }
    }

    applyFeatureGating() {
        if (!this.invitationData || !this.invitationData.plan) return;

        const features = this.invitationData.plan.features || {};
        
        console.log('[Divinos Engine] Checando limites do Plano:', this.invitationData.plan.name);

        // 1. LIVE STREAM: Se não houver, varre a página e remove o container (se estiver no Canva design)
        if (!features.has_live_stream) {
            const liveStreamContainers = document.querySelectorAll('[data-invite="livestream-player"]');
            liveStreamContainers.forEach(el => {
                el.style.display = 'none';
                el.innerHTML = '';
            });
            console.log('- Live Stream desabilitado para este plano.');
        }

        // 2. MURAL UPLOADS: Ocultar botão de submissão do mural
        if (!features.has_guest_uploads) {
            const muralUploadBtn = document.querySelectorAll('[data-invite="mural-upload-trigger"]');
            muralUploadBtn.forEach(el => el.style.display = 'none');
            console.log('- Upload de fotos no mural pelos convidados desabilitado.');
        }
        
        // 3. Pode incluir limite de galeria (max_photos)
        // Guardamos este limite na variável para uso na hora de renderizar a galeria:
        this.maxPhotosLimit = features.max_photos || 5;
    }

    bindDataAttributes() {
        if (!this.invitationData) return;

        // Names
        const brideData = this.invitationData.details?.[0]?.bride_name || 'Noiva';
        const groomData = this.invitationData.details?.[0]?.groom_name || 'Noivo';

        document.querySelectorAll('[data-invite="bride-name"]').forEach(el => el.textContent = brideData);
        document.querySelectorAll('[data-invite="groom-name"]').forEach(el => el.textContent = groomData);
        
        const dateData = this.invitationData.event_date ? new Date(this.invitationData.event_date).toLocaleDateString('pt-PT') : 'Data Indefinida';
        document.querySelectorAll('[data-invite="wedding-date"]').forEach(el => el.textContent = dateData);
    }

    bindEvents() {
        // Ligação do botão RSVP importado do Canva ao nosso modal
        const rsvpTriggers = document.querySelectorAll('[data-invite="rsvp-trigger"]');
        rsvpTriggers.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRsvpModal();
            });
        });
    }

    setupEnvelopeAndMusic() {
        // Envelope original Divinos
        const btnOpen = document.getElementById('btn-open-envelope');
        const envelopeScreen = document.getElementById('envelope-screen');
        const audio = document.getElementById('wedding-audio');
        const musicBtn = document.getElementById('music-btn');

        // Configurar a música vinda do banco de dados (se houver)
        if (this.invitationData) {
            const musicUrl = this.invitationData.music_url || (this.invitationData.details?.[0]?.music_url);
            if (musicUrl && audio) {
                audio.src = musicUrl;
                audio.load();
                if (musicBtn) musicBtn.style.display = 'flex'; // Mostra o botão de controle de música se houver música
            }
        }

        if (btnOpen && envelopeScreen) {
            btnOpen.addEventListener('click', () => {
                // Animação "Estilo Palácio" — idêntica ao convite oficial
                // Passo 1: Adicionar classe que dispara as portas abrindo via CSS
                envelopeScreen.classList.add('envelope-open');

                // Passo 2: Após a animação das portas (1.8s), esconder o envelope
                setTimeout(() => {
                    envelopeScreen.classList.add('hidden');
                    document.body.classList.add('envelope-dismissed');
                }, 1800);

                // Tocar a música
                if (audio && audio.src) {
                    audio.play().catch(e => console.warn('[Divinos Engine] Autoplay bloqueado pelo navegador', e));
                    window.isMusicPlaying = true;
                }
            });
        }

        // Controle de play/pause manual
        if (musicBtn && audio) {
            musicBtn.addEventListener('click', () => {
                if (window.isMusicPlaying) {
                    audio.pause();
                    window.isMusicPlaying = false;
                    musicBtn.innerHTML = '<i class="fas fa-play"></i>';
                } else {
                    audio.play();
                    window.isMusicPlaying = true;
                    musicBtn.innerHTML = '<i class="fas fa-music"></i>';
                }
            });
        }
    }

    setupLiveStream() {
        if (!this.invitationData) return;
        
        // Verifica se o LiveKit está disponível e se o plano permite (Feature Gating validou isso e pode ter ocultado)
        const liveToken = this.invitationData.live_token || (this.invitationData.details?.[0]?.live_token);
        const liveContainer = document.querySelector('[data-invite="livestream-player"]');
        
        if (liveToken && liveContainer && liveContainer.style.display !== 'none' && window.LivekitClient) {
            console.log('[Divinos Engine] Conectando à Live Stream...');
            liveContainer.innerHTML = `
                <audio id="live-audio-player" autoplay playsinline></audio>
                <video id="live-video-player" autoplay playsinline style="width:100%; height:100%; object-fit:cover;"></video>
            `;
            
            const room = new window.LivekitClient.Room();
            room.on(window.LivekitClient.RoomEvent.TrackSubscribed, (track) => {
                if (track.kind === window.LivekitClient.Track.Kind.Video) {
                    track.attach(document.getElementById('live-video-player'));
                } else if (track.kind === window.LivekitClient.Track.Kind.Audio) {
                    track.attach(document.getElementById('live-audio-player'));
                    
                    // Pausar música ambiente se a live tiver áudio
                    const wAudio = document.getElementById('wedding-audio');
                    if (wAudio) {
                        wAudio.pause();
                        window.isMusicPlaying = false;
                        const mBtn = document.getElementById('music-btn');
                        if (mBtn) mBtn.innerHTML = '<i class="fas fa-play"></i>';
                    }
                }
            });
            
            // Substitua 'wss://seuservidor.livekit' pela URL real configurada no dashboard ou em variáveis
            const LIVEKIT_URL = window.DIVINOS_LIVEKIT_URL || 'wss://divinos-live.livekit.cloud'; 
            room.connect(LIVEKIT_URL, liveToken).catch(e => {
                console.error('[Divinos Engine] Erro ao conectar no LiveKit:', e);
                liveContainer.innerHTML = '<p style="color:white;">Transmissão indisponível</p>';
            });
        }
    }

    async submitRsvp() {
        if (!this.invitationId) return;

        const btn = document.getElementById('divinos-rsvp-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        const name = document.getElementById('rsvp-name').value.trim();
        const presence = document.querySelector('input[name="rsvp-presence"]:checked').value;
        const msg = document.getElementById('rsvp-msg').value.trim();

        try {
            const { error } = await window.supabaseClient.from('invitations_rsvp').insert({
                invitation_id: this.invitationId,
                guest_name: name,
                is_attending: presence === 'yes',
                message: msg,
                adult_count: presence === 'yes' ? 1 : 0
            });

            if (error) throw error;

            document.getElementById('divinos-rsvp-form').style.display = 'none';
            document.getElementById('divinos-rsvp-success').style.display = 'block';
        } catch (e) {
            console.error('Erro ao enviar RSVP', e);
            alert('Falha ao conectar. Tente novamente mais tarde.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enviar Confirmação';
        }
    }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
    // Injeta a keyframes animation se não existir
    if (!document.getElementById('divinos-animations')) {
        const style = document.createElement('style');
        style.id = 'divinos-animations';
        style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`;
        document.head.appendChild(style);
    }
    
    window.divinosEngine = new DivinosInviteEngine();
});
