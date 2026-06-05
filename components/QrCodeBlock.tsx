import QRCode from "qrcode";

export async function QrCodeBlock({ value }: { value: string }) {
  const dataUrl = await QRCode.toDataURL(value, {
    margin: 1,
    width: 180,
    color: {
      dark: "#171614",
      light: "#ffffff",
    },
  });

  return (
    <div className="qr-card">
      <img src={dataUrl} alt="QR Code للدعوة" width={180} height={180} />
      <strong>امسح الكود وافتح الدعوة</strong>
    </div>
  );
}
