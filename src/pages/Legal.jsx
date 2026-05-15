import React from 'react';
import Footer from '../components/Footer';

export default function Legal({ title }) {
  const isPrivacy = title === 'Privacy Policy';
  
  return (
    <main>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>{title}</h1>
          
          <div className="legal-content" style={{ color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text)' }}>Last Updated: May 13, 2026</p>
            
            <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '1rem' }}>1. Overview</h3>
            <p>
              Welcome to Digitaland.ai. Your {isPrivacy ? 'privacy' : 'use of our services'} is of paramount importance to us. 
              This document outlines our commitment to {isPrivacy ? 'protecting your personal data' : 'the terms governing our relationship with you'}.
            </p>

            <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '1rem' }}>2. {isPrivacy ? 'Data Collection' : 'Acceptable Use'}</h3>
            <p>
              {isPrivacy 
                ? 'We only collect essential information required to provide our API services, such as your email address and usage metrics. We never store your prompts or AI completions.' 
                : 'Users are prohibited from using the Digitaland.ai API for illegal activities, generating harmful content, or attempting to reverse-engineer our infrastructure.'}
            </p>

            <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '1rem' }}>3. {isPrivacy ? 'Security Protocols' : 'Limitation of Liability'}</h3>
            <p>
              {isPrivacy 
                ? 'All data is encrypted in transit and at rest. We use enterprise-grade security standards to ensure your account and API keys remain confidential.' 
                : 'Digitaland.ai is provided "as is". While we strive for 99.9% uptime, we are not liable for any indirect damages resulting from service interruptions.'}
            </p>

            <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '1rem' }}>4. Contact Us</h3>
            <p>
              If you have any questions regarding our {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}, please contact our legal team at legal@digitaland.ai.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
