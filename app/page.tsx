import Navbar from './components/Navbar';
import { StatCard } from './components/ui/StatCard';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            소상공인 정보 트래커
          </h1>
          <p className="mb-6 text-lg text-gray-600">
            공공데이터포털에서 소상공인 정보를 자동으로 수집하고 관리합니다.
          </p>
        </div>

        <StatsSection />

        <div className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="자동 데이터 수집"
              description="공공데이터포털 API를 통해 자동으로 소상공인 정보를 수집합니다."
              icon="🔄"
            />
            <FeatureCard
              title="신규 등록 감지"
              description="새로 등록된 소상공인을 자동으로 감지하고 Slack으로 알림을 보냅니다."
              icon="🆕"
            />
            <FeatureCard
              title="데이터 검색"
              description="상호명, 주소, 업종별로 소상공인을 검색할 수 있습니다."
              icon="🔍"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatsSection() {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-gray-100 p-6 animate-pulse h-32" />
      <div className="rounded-lg bg-gray-100 p-6 animate-pulse h-32" />
      <div className="rounded-lg bg-gray-100 p-6 animate-pulse h-32" />
      <div className="rounded-lg bg-gray-100 p-6 animate-pulse h-32" />
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
