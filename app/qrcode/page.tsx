import AuthGuard from "@/app/components/auth/AuthGuard"
import QRCodeContent from "@/app/components/dashboard/QrCodeContent"

export const dynamic = 'force-dynamic';

export default function QRCodePage() {
  return (
    <AuthGuard>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">QR Code</h1>
        <QRCodeContent />
      </div>
    </AuthGuard>
  )
}

