import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, FileText, AlertTriangle } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  const content = type === 'privacy' ? (
    <div className="space-y-6 text-sm text-black/70 leading-relaxed">
      <section className="space-y-2">
        <h3 className="font-bold text-black text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          Privacy Policy
        </h3>
        <p className="text-xs text-black/40 italic">Last Updated: March 10, 2026</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">1. Information We Collect</h4>
        <p>We collect information you provide directly to us, including your name, email address, profile photo, and any data related to your inventory items and mileage tracking. This includes images uploaded for analysis.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">2. How We Use Your Information</h4>
        <p>We use the information we collect to provide, maintain, and improve our services, including the AI-powered item analysis and mileage tracking features. We also use it to process payments via Stripe and communicate with you about your account.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">3. Data Sharing</h4>
        <p>We share your data with third-party service providers as necessary to provide our services. This includes Google (for AI analysis via Gemini API) and Stripe (for payment processing). We do not sell your personal information to third parties.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">4. AI Analysis Disclaimer</h4>
        <p>Your uploaded images are processed by AI models. While we strive for accuracy, these models may process and store data according to their own privacy policies. By using the analyzer, you consent to this processing.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">5. Your Rights</h4>
        <p>You have the right to access, correct, or delete your personal information. You can manage your profile data within the application settings or contact us for assistance.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">6. Contact Us</h4>
        <p>If you have any questions about this Privacy Policy, please contact us at saritaevans11@gmail.com.</p>
      </section>
    </div>
  ) : (
    <div className="space-y-6 text-sm text-black/70 leading-relaxed">
      <section className="space-y-2">
        <h3 className="font-bold text-black text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Terms of Service
        </h3>
        <p className="text-xs text-black/40 italic">Last Updated: March 10, 2026</p>
      </section>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <p className="font-bold uppercase tracking-wider mb-1">Critical Disclaimer</p>
          <p className="font-medium">The SnapFlip AI Analyzer is not perfect and can be wrong. All estimates, including suggested titles, brands, conditions, and resale prices, are for informational purposes only. We do not guarantee any specific sale price or profit margin.</p>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">1. Acceptance of Terms</h4>
        <p>By creating an account or using SnapFlip, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">2. Description of Service</h4>
        <p>SnapFlip provides AI-powered tools for resellers, including item analysis, inventory management, and mileage tracking. The service is provided "as is" and "as available."</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">3. User Responsibilities</h4>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate information when creating your profile.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">4. Limitation of Liability</h4>
        <p>To the maximum extent permitted by law, SnapFlip and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the service or reliance on the AI analyzer.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">5. Subscription and Payments</h4>
        <p>Paid tiers are billed in advance on a recurring basis. No refunds will be provided for partial months of service or unused lookup credits.</p>
      </section>

      <section className="space-y-2">
        <h4 className="font-bold text-black uppercase text-[10px] tracking-widest">6. Termination</h4>
        <p>We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or our business interests.</p>
      </section>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-[#F5F5F0] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white">
              <h2 className="font-display text-xl italic font-bold">
                {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar">
              {content}
            </div>

            <div className="p-6 border-t border-black/5 bg-white flex justify-end">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-[#1A1A1A] text-white rounded-full font-bold text-sm shadow-lg hover:bg-black transition-colors"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
