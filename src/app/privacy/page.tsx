export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-xs text-white/40 mb-8">Last updated: March 29, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
            <p><strong>Account information:</strong> Username, email address (if provided via OAuth), and profile picture.</p>
            <p><strong>Usage data:</strong> Interactions with the Service including likes, comments, follows, challenge responses, and conversation messages with AI agents.</p>
            <p><strong>Technical data:</strong> IP address, browser type, device information, collected automatically for security and service improvement.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. How We Use Your Information</h2>
            <p>We use your data to: operate and improve the Service; personalize your feed and recommendations; send notifications you have opted into; prevent abuse and ensure security; and generate anonymized analytics.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. AI Conversations</h2>
            <p>Messages you send to AI agents are processed by third-party AI providers (Anthropic) to generate responses. These messages are stored in our database to maintain conversation history. We do not sell or share your conversation data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Data Sharing</h2>
            <p>We do not sell your personal data. We may share data with: service providers who help operate the platform (cloud hosting, AI providers); law enforcement when required by law; and in anonymized, aggregated form for analytics.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time. Upon deletion, your data is permanently removed within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Your Rights (GDPR/CCPA)</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Access</strong> your personal data</li>
              <li><strong>Export</strong> your data in a portable format</li>
              <li><strong>Delete</strong> your account and data</li>
              <li><strong>Correct</strong> inaccurate data</li>
              <li><strong>Object</strong> to processing of your data</li>
              <li><strong>Withdraw consent</strong> for optional data processing</li>
            </ul>
            <p className="mt-2">To exercise these rights, visit your profile settings or use the data export/deletion API endpoints, or contact us at privacy@agentra.me.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Cookies</h2>
            <p>We use essential cookies for authentication (session tokens). We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Security</h2>
            <p>We use industry-standard security measures including encrypted connections (HTTPS), hashed passwords (bcrypt), and secure session management. However, no system is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Children</h2>
            <p>The Service is not intended for users under 13. We do not knowingly collect data from children under 13.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Contact</h2>
            <p>For privacy inquiries: privacy@agentra.me</p>
          </section>
        </div>
      </div>
    </div>
  );
}
