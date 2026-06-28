import { ProfessionalTradingDashboard } from '@/components/ProfessionalTradingDashboard';

export const metadata = {
  title: 'Professional Trading Dashboard | ProfitForce',
  description: 'Real-time BUY/SELL signals for stocks, crypto, F&O, and forex with 100% market coverage'
};

export default function SignalsPage() {
  return (
    <main className="min-h-screen">
      <ProfessionalTradingDashboard />
    </main>
  );
}
