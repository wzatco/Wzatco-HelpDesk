// Leave Chat Confirmation Modal
'use client';

export default function LeaveChatModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white p-4">
          <h3 className="text-lg font-bold text-white">Leave Chat?</h3>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              Are you sure you want to leave the chat?
            </p>
            <p className="text-sm text-gray-500">
              Your conversation will be saved and you can continue later.
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Stay in Chat
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white rounded-lg transition-all duration-200 font-medium shadow-lg"
            >
              Leave Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

