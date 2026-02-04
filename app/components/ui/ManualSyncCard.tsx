'use client';

export function ManualSyncCard() {
  async function handleManualSync() {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        alert('동기화가 시작되었습니다.');
        window.location.reload();
      } else {
        alert(`동기화 실패: ${data.message}`);
      }
    } catch (error) {
      alert(`동기화 실패: ${error}`);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        수동 동기화
      </h3>
      <p className="mb-4 text-sm text-gray-600">
        버튼을 클릭하여 공공데이터포털에서 데이터를 동기화합니다.
      </p>
      <button
        onClick={handleManualSync}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        동기화 시작
      </button>
    </div>
  );
}
