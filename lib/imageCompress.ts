// تصغير صورة قبل الرفع من المتصفح/الجوال. صور الهواتف الحديثة 3-8 ميغابايت فكانت
// تُرفض بحد 4MB (وحد جسم الطلب في فيرسل ~4.5MB). نُصغّر إلى 1600px كحد أقصى
// بصيغة JPEG جودة 0.85 (تقرأ HEIC أيضًا حيث يفك المتصفح تشفيره، كسفاري iOS).
// أي فشل في التصغير → نرجع الملف الأصلي ليقرر السيرفر قبوله أو رفضه.
const MAX_DIMENSION = 1600;
const SKIP_BELOW_BYTES = 800 * 1024;

export async function compressImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES && file.type === 'image/jpeg') {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
