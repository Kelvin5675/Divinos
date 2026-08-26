const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');

router.get('/plans', invitationController.getPlans);
router.get('/public/:slug', invitationController.getPublicInvitation);
router.get('/meta/:slug', invitationController.getInvitationMetaPage);
router.post('/:invitation_id/rsvp', invitationController.submitRsvp);

// Professional Platform Routes
router.post('/orders', invitationController.createOrder); // Public: Place order
router.get('/orders', invitationController.getOrders); // Admin: List orders
router.post('/generate-ia', invitationController.generateWithIA); // Admin: AI Generation
router.post('/', invitationController.createInvitation); // Admin: Save invitation
router.get('/dashboard/:token', invitationController.getDashboardData); // Public: Couples Dashboard

// --- Smart List Routes ---
router.get('/:invitation_id/smart-list', invitationController.getSmartList);
router.post('/:invitation_id/smart-list/bulk', invitationController.addToSmartListBulk);
router.delete('/smart-list/:id', invitationController.removeFromSmartList);
router.patch('/:invitation_id/privacy', invitationController.togglePrivacyMode);

module.exports = router;
