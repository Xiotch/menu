// payment.js
export function setupPaymentSystem(db, restaurantId) {
    // Payment variables
    let adminUPIIds = {};
    
    // DOM Elements
    const payBillBtn = document.getElementById('pay-bill-btn');
    const payBillModal = document.getElementById('pay-bill-modal');
    const closePayBill = document.getElementById('close-pay-bill');
    const billAmountInput = document.getElementById('bill-amount-input');
    const paymentOptions = document.getElementById('payment-options');
    const paymentButtons = document.querySelectorAll('.payment-btn');
    
    // Event Listeners
    payBillBtn?.addEventListener('click', openPaymentModal);
    closePayBill?.addEventListener('click', closePaymentModal);
    billAmountInput?.addEventListener('input', validateAmount);
    paymentButtons.forEach(btn => btn.addEventListener('click', processPayment));
    
    // Functions
    async function openPaymentModal() {
        payBillModal.style.display = 'flex';
        billAmountInput.value = '';
        paymentOptions.style.display = 'none';
        await loadPaymentSettings();
    }
    
    function closePaymentModal() {
        payBillModal.style.display = 'none';
    }
    
    function validateAmount() {
        paymentOptions.style.display = billAmountInput.value > 0 ? 'block' : 'none';
    }
    
    async function loadPaymentSettings() {
        try {
            const settingsDoc = doc(db, "restaurants", restaurantId, "settings", "payments");
            const settingsSnap = await getDoc(settingsDoc);
            if (settingsSnap.exists()) {
                adminUPIIds = settingsSnap.data().upiIds || {};
            }
        } catch (error) {
            console.error("Error loading payment settings:", error);
        }
    }
    
    function processPayment(e) {
        const method = e.currentTarget.getAttribute('data-method');
        const amount = parseFloat(billAmountInput.value);
        const merchantName = document.getElementById('restaurant-name').textContent || "Merchant";
        
        if (!amount || amount <= 0) {
            alert("Please enter a valid amount greater than ₹0.");
            return;
        }
        
        const upiId = adminUPIIds[method];
        if (!upiId) {
            alert("This payment method is not available.");
            return;
        }
        
        const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&cu=INR`;
        
        // Try to open UPI app
        window.location.href = upiUri;
        payBillModal.style.display = 'none';
        
        // Fallback if UPI app doesn't open
        setTimeout(() => {
            if (!document.hidden) {
                showManualPaymentInstructions(upiId, amount.toFixed(2), merchantName);
            }
        }, 500);
    }
    
    function showManualPaymentInstructions(upiId, amount, merchantName) {
        // ... (keep your existing manual payment instructions code) ...
    }
}