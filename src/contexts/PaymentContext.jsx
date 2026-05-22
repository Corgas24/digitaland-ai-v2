import React, { createContext, useContext, useState } from 'react';
import PaymentModal from '../components/PaymentModal';

const PaymentContext = createContext(null);

export function PaymentProvider({ children }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledAmount, setPrefilledAmount] = useState(null);

  const openPaymentModal = (amount = null) => {
    setPrefilledAmount(amount);
    setIsModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsModalOpen(false);
    setPrefilledAmount(null);
  };

  return (
    <PaymentContext.Provider value={{ openPaymentModal, closePaymentModal, isModalOpen }}>
      {children}
      <PaymentModal 
        isOpen={isModalOpen} 
        onClose={closePaymentModal} 
        prefilledAmount={prefilledAmount} 
      />
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}
